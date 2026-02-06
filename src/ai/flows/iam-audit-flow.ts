
'use server';
/**
 * @fileOverview AI IAM Compliance Audit Flow.
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
});

const IamAuditOutputSchema = z.object({
  score: z.number().describe('A compliance score from 0-100.'),
  summary: z.string().describe('Overall summary of the IAM health.'),
  findings: z.array(AuditFindingSchema),
});

export type IamAuditOutput = z.infer<typeof IamAuditOutputSchema>;

const SYSTEM_PROMPT = `You are a specialized IAM Auditor.
Analyze the provided identity and assignment data against the specified audit criteria.

Criteria to apply:
{{#each criteria}}
- {{{title}}}: {{{description}}} (Severity: {{{severity}}})
{{/each}}

Identify violations such as Privilege Creep, SoD conflicts, Orphaned accounts, etc.
Return your response as a valid JSON object matching the requested schema.`;

const iamAuditFlow = ai.defineFlow(
  {
    name: 'iamAuditFlow',
    inputSchema: IamAuditInputSchema,
    outputSchema: IamAuditOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    const prompt = `Audit the following data:
Users: ${input.users.length}
Assignments: ${input.assignments.length}
Resources: ${input.resources.length}`;

    // Direct OpenRouter handling
    if (config?.provider === 'openrouter') {
      const client = new OpenAI({
        apiKey: config.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
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
      summary: "Audit konnte nicht durchgeführt werden.",
      findings: []
    };
  }
}
