
'use server';
/**
 * @fileOverview AI IAM Compliance Audit Flow.
 * Optimized for SoD (Segregation of Duties) and Regional Compliance patterns.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { getCollectionData } from '@/app/actions/mysql-actions';
import { DataSource, Tenant } from '@/lib/types';
import OpenAI from 'openai';

const IamAuditInputSchema = z.object({
  users: z.array(z.any()),
  assignments: z.array(z.any()),
  resources: z.array(z.any()),
  entitlements: z.array(z.any()),
  criteria: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.string()
  })),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
  tenantId: z.string().optional(),
});

const AuditFindingSchema = z.object({
  entityId: z.string(),
  entityName: z.string(),
  finding: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  recommendation: z.string(),
  criteriaMatched: z.string(),
  isSodConflict: z.boolean().optional().describe('Whether this is a Segregation of Duties violation.'),
});

const IamAuditOutputSchema = z.object({
  score: z.number().describe('A compliance score from 0-100.'),
  summary: z.string().describe('Overall summary of the IAM health.'),
  findings: z.array(AuditFindingSchema),
});

export type IamAuditOutput = z.infer<typeof IamAuditOutputSchema>;

const SYSTEM_PROMPT = `You are an elite Enterprise IAM Auditor specializing in GRC (Governance, Risk, and Compliance).
Your task is to perform a deep analysis of user identities and their assigned permissions.

CORE FOCUS:
1. Segregation of Duties (SoD): Identify users holding conflicting roles (e.g., someone who can both initiate and approve a payment). 
   CRITICAL: Correlate cross-system permissions!
2. Principle of Least Privilege: Detect over-privileged accounts.
3. Regional Compliance: Respect the specific regulatory framework of the company (e.g. GDPR, BSI, NIST).
4. High-Risk Concentrations: Identify users with too many critical (Admin) roles.

ANALYSIS METHODOLOGY:
- Correlate users, their departments, and all their active assignments.
- Check against the specific 'Audit Criteria' provided.
- Factor in the 'Regional Context' provided in the prompt.

RESPONSE FORMAT (STRICT JSON):
Return a valid JSON object matching the schema. Translate findings and summaries into German.
Mark SoD conflicts specifically with "isSodConflict: true".

{
  "score": number (0-100),
  "summary": "Analytische Zusammenfassung auf Deutsch",
  "findings": [
    { 
      "entityId": "User-ID", 
      "entityName": "Anzeigename", 
      "finding": "Verstoß", 
      "severity": "low|medium|high|critical", 
      "recommendation": "Handlungsempfehlung", 
      "criteriaMatched": "Regelname",
      "isSodConflict": boolean
    }
  ]
}`;

const iamAuditFlow = ai.defineFlow(
  {
    name: 'iamAuditFlow',
    inputSchema: IamAuditInputSchema,
    outputSchema: IamAuditOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    
    // Fetch Tenant Context for Regional Compliance
    let regionalContext = "General ISO 27001";
    if (input.tenantId && input.tenantId !== 'all') {
      const tenantRes = await getCollectionData('tenants', input.dataSource as DataSource);
      const tenant = tenantRes.data?.find((t: Tenant) => t.id === input.tenantId);
      if (tenant?.region) regionalContext = tenant.region;
    }

    const criteriaList = input.criteria
      .map((c: any) => `- ${c.title}: ${c.description} (Severity: ${c.severity})`)
      .join('\n');

    const auditContext = {
      regionalFramework: regionalContext,
      userCount: input.users.length,
      criteria: criteriaList,
      sampleData: input.users.map(u => ({
        id: u.id,
        name: u.displayName,
        dept: u.department,
        roles: input.assignments
          .filter(a => a.userId === u.id && a.status === 'active')
          .map(a => {
            const ent = input.entitlements.find(e => e.id === a.entitlementId);
            const res = input.resources.find(r => r.id === ent?.resourceId);
            return `${res?.name}: ${ent?.name}${ent?.isAdmin ? ' (ADMIN)' : ''}`;
          })
      }))
    };

    const prompt = `REGIONAL CONTEXT: This company follows ${regionalContext} compliance rules.
Perform a high-precision IAM Audit based on this data:
${JSON.stringify(auditContext, null, 2)}

Ensure you check every user's role combination for potential SoD conflicts based on common business logic.`;

    // Direct OpenRouter handling
    if (config?.provider === 'openrouter') {
      const client = new OpenAI({
        apiKey: config.openrouterApiKey || '',
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: { "HTTP-Referer": "https://compliance-hub.local", "X-Title": "ComplianceHub" }
      });

      const response = await client.chat.completions.create({
        model: config.openrouterModel || 'google/gemini-2.0-flash-001',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}') as IamAuditOutput;
    }

    const modelIdentifier = config?.provider === 'ollama' 
      ? `ollama/${config.ollamaModel || 'llama3'}` 
      : `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;
    
    const { output } = await ai.generate({
      model: modelIdentifier,
      system: SYSTEM_PROMPT,
      prompt,
      output: { schema: IamAuditOutputSchema }
    });

    if (!output) throw new Error('AI failed to perform audit.');
    return output;
  }
);

export async function runIamAudit(input: any): Promise<IamAuditOutput> {
  try {
    return await iamAuditFlow(input);
  } catch (error: any) {
    console.error("IAM Audit Error:", error);
    return {
      score: 0,
      summary: `Audit-Fehler: ${error.message || "Verbindung fehlgeschlagen"}.`,
      findings: []
    };
  }
}
