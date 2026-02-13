
'use server';
/**
 * @fileOverview AI Flow for Policy Validation and Gap Analysis.
 * Checks if a policy text covers the linked risks and measures effectively.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig, getCompanyContext } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';
import OpenAI from 'openai';

const PolicyValidatorInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  linkedRisks: z.array(z.object({
    title: z.string(),
    description: z.string()
  })),
  linkedMeasures: z.array(z.object({
    title: z.string(),
    description: z.string()
  })),
  tenantId: z.string().optional(),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
});

export type PolicyValidatorInput = z.infer<typeof PolicyValidatorInputSchema>;

const PolicyValidatorOutputSchema = z.object({
  complianceScore: z.number().describe('A score from 0-100 indicating how well the policy covers the linked GRC objects.'),
  summary: z.string().describe('Executive summary of the validation result.'),
  gaps: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    finding: z.string(),
    recommendation: z.string()
  })).describe('Identified weaknesses in the policy text.'),
  strengths: z.array(z.string()).describe('Strong areas of the policy.')
});

export type PolicyValidatorOutput = z.infer<typeof PolicyValidatorOutputSchema>;

const SYSTEM_PROMPT = `You are an expert GRC Auditor specializing in ISO 27001 and NIST frameworks.
Your task is to validate a policy document (e.g. an IT Security Policy or Data Protection Agreement) 
against its linked risk scenarios and mitigation measures.

CRITICAL FOCUS:
1. Does the policy text actually address the risks linked to it?
2. Are the linked measures (TOMs) properly described as binding rules in the policy?
3. Is the language professional, binding, and clear?

Translate the summary and findings into German.
Return a valid JSON object matching the schema.`;

const policyValidatorFlow = ai.defineFlow(
  {
    name: 'policyValidatorFlow',
    inputSchema: PolicyValidatorInputSchema,
    outputSchema: PolicyValidatorOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    const companyContext = await getCompanyContext(input.tenantId || '', input.dataSource as DataSource);

    const contextStr = `
UNTERNEHMEN: ${companyContext}
RICHTLINIE: ${input.title}
INHALT: ${input.content}

VERKNÜPFTE RISIKEN:
${input.linkedRisks.map(r => `- ${r.title}: ${r.description}`).join('\n')}

VERKNÜPFTE MASSNAHMEN (TOM):
${input.linkedMeasures.map(m => `- ${m.title}: ${m.description}`).join('\n')}
    `;

    if (config?.provider === 'openrouter') {
      const client = new OpenAI({ apiKey: config.openrouterApiKey, baseURL: 'https://openrouter.ai/api/v1' });
      const response = await client.chat.completions.create({
        model: config.openrouterModel || 'google/gemini-2.0-flash-001',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: contextStr }],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices[0].message.content || '{}') as PolicyValidatorOutput;
    }

    const modelIdentifier = config?.provider === 'ollama' 
      ? `ollama/${config.ollamaModel || 'llama3'}` 
      : `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;

    const { output } = await ai.generate({
      model: modelIdentifier,
      system: SYSTEM_PROMPT,
      prompt: contextStr,
      output: { schema: PolicyValidatorOutputSchema }
    });

    if (!output) throw new Error('AI failed to validate policy.');
    return output;
  }
);

export async function runPolicyValidation(input: PolicyValidatorInput): Promise<PolicyValidatorOutput> {
  try {
    return await policyValidatorFlow(input);
  } catch (error: any) {
    console.error("Policy AI Audit Error:", error);
    return {
      complianceScore: 0,
      summary: "Fehler bei der KI-Analyse. Bitte prüfen Sie die Provider-Einstellungen.",
      gaps: [{ severity: 'high', finding: 'Konnektivitätsfehler', recommendation: 'KI-Anbindung prüfen' }],
      strengths: []
    };
  }
}
