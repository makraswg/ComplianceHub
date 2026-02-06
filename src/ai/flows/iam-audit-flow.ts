
'use server';
/**
 * @fileOverview AI IAM Compliance Audit Flow.
 * 
 * Analyzes IAM data against criteria to find security gaps.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';

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
});

const IamAuditOutputSchema = z.object({
  score: z.number().describe('A compliance score from 0-100.'),
  summary: z.string().describe('Overall summary of the IAM health.'),
  findings: z.array(AuditFindingSchema),
});

export type IamAuditOutput = z.infer<typeof IamAuditOutputSchema>;

async function getAuditModel(dataSource: DataSource = 'mysql') {
  const config = await getActiveAiConfig(dataSource);
  if (config && config.provider === 'ollama' && config.enabled) {
    return `ollama/${config.ollamaModel || 'llama3'}`;
  }
  return `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;
}

const SYSTEM_PROMPT = `You are a specialized IAM Auditor.
Analyze the provided identity and assignment data against the specified audit criteria.

Criteria to apply:
{{#each criteria}}
- {{{title}}}: {{{description}}} (Severity: {{{severity}}})
{{/each}}

Identify violations such as:
- Privilege Creep (too many admin roles)
- Segregation of Duties (SoD) conflicts
- Orphaned accounts
- Expired but active roles

Output a list of specific findings with recommendations.`;

const iamAuditFlow = ai.defineFlow(
  {
    name: 'iamAuditFlow',
    inputSchema: IamAuditInputSchema,
    outputSchema: IamAuditOutputSchema,
  },
  async (input) => {
    const modelIdentifier = await getAuditModel(input.dataSource as DataSource);
    
    const { output } = await ai.generate({
      model: modelIdentifier,
      system: SYSTEM_PROMPT,
      prompt: `Audit the following data:
Users: ${input.users.length}
Assignments: ${input.assignments.length}
Resources: ${input.resources.length}`,
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
      summary: "Audit konnte nicht durchgeführt werden.",
      findings: []
    };
  }
}
