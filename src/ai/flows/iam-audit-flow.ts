
'use server';
/**
 * @fileOverview AI IAM Compliance Audit Flow.
 * Optimized for SoD (Segregation of Duties) and Enterprise Risk patterns.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';
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
2. Principle of Least Privilege: Detect over-privileged accounts or "Privilege Creep" over time.
3. Orphaned/Ghost Accounts: Find active permissions for disabled users.
4. High-Risk Concentrations: Identify users with too many critical (Admin) roles across different systems.

ANALYSIS METHODOLOGY:
- Correlate users, their departments, and all their active assignments.
- Check against the specific 'Audit Criteria' provided by the user.
- If a user has multiple roles in the same system or across related systems (e.g. Finance + ERP), check for SoD violations.

RESPONSE FORMAT (STRICT JSON):
Return a valid JSON object matching the schema. Translate findings and summaries into German.
Mark SoD conflicts specifically with "isSodConflict: true".

{
  "score": number (0-100, where 100 is perfectly compliant),
  "summary": "Analytische Zusammenfassung der Sicherheitslage auf Deutsch",
  "findings": [
    { 
      "entityId": "User-ID", 
      "entityName": "Anzeigename", 
      "finding": "Präzise Beschreibung des Verstoßes", 
      "severity": "low|medium|high|critical", 
      "recommendation": "Konkrete Handlungsempfehlung (z.B. Entzug der Rolle X)", 
      "criteriaMatched": "Name des Kriteriums",
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
    
    const criteriaList = input.criteria
      .map((c: any) => `- ${c.title}: ${c.description} (Severity: ${c.severity})`)
      .join('\n');

    // Optimization: Only send relevant data to avoid token limits
    const auditContext = {
      userCount: input.users.length,
      assignmentCount: input.assignments.length,
      criteria: criteriaList,
      // Provide a structured snapshot of the most important data points
      sampleData: input.users.map(u => ({
        id: u.id,
        name: u.displayName,
        dept: u.department,
        enabled: u.enabled,
        roles: input.assignments
          .filter(a => a.userId === u.id && a.status === 'active')
          .map(a => {
            const ent = input.entitlements.find(e => e.id === a.entitlementId);
            const res = input.resources.find(r => r.id === ent?.resourceId);
            return `${res?.name}: ${ent?.name}${ent?.isAdmin ? ' (ADMIN)' : ''}`;
          })
      }))
    };

    const prompt = `Perform a high-precision IAM Audit based on this data:
${JSON.stringify(auditContext, null, 2)}

Ensure you check every user's role combination for potential SoD conflicts based on common business logic (Finance, IT, HR separation).`;

    // Direct OpenRouter handling
    if (config?.provider === 'openrouter') {
      const client = new OpenAI({
        apiKey: config.openrouterApiKey || '',
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          "HTTP-Referer": "https://compliance-hub.local",
          "X-Title": "ComplianceHub",
        }
      });

      const response = await client.chat.completions.create({
        model: config.openrouterModel || 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('AI failed to perform audit via OpenRouter.');
      return JSON.parse(content) as IamAuditOutput;
    }

    // Standard Genkit handling
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
