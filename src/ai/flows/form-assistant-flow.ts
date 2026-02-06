
'use server';
/**
 * @fileOverview AI Form Assistant Flow.
 * 
 * Provides contextual suggestions for completing compliance forms (Resources, Risks, etc.)
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';

const FormAssistantInputSchema = z.object({
  formType: z.enum(['resource', 'risk', 'measure', 'gdpr']),
  partialData: z.any(),
  userPrompt: z.string(),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
});

const FormAssistantOutputSchema = z.object({
  suggestions: z.record(z.any()).describe('A mapping of field keys to suggested values.'),
  explanation: z.string().describe('Explanation of why these values were suggested.'),
});

export type FormAssistantInput = z.infer<typeof FormAssistantInputSchema>;
export type FormAssistantOutput = z.infer<typeof FormAssistantOutputSchema>;

async function getAssistantModel(dataSource: DataSource = 'mysql') {
  const config = await getActiveAiConfig(dataSource);
  if (config && config.provider === 'ollama' && config.enabled) {
    return `ollama/${config.ollamaModel || 'llama3'}`;
  }
  return `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;
}

const SYSTEM_PROMPT = `You are an expert IT GRC (Governance, Risk, and Compliance) assistant.
Your task is to help the user complete professional forms for IT systems, risk management, and data protection.

Context: {{{formType}}}
Current Data: {{{partialData}}}

Based on the user's prompt and current context, suggest professional values for the missing or incomplete fields.
Be specific, adhere to BSI IT-Grundschutz and ISO 27001 standards where applicable.`;

const formAssistantFlow = ai.defineFlow(
  {
    name: 'formAssistantFlow',
    inputSchema: FormAssistantInputSchema,
    outputSchema: FormAssistantOutputSchema,
  },
  async (input) => {
    const modelIdentifier = await getAssistantModel(input.dataSource as DataSource);
    
    const { output } = await ai.generate({
      model: modelIdentifier,
      system: SYSTEM_PROMPT,
      prompt: input.userPrompt,
      output: { schema: FormAssistantOutputSchema }
    });

    if (!output) throw new Error('AI failed to generate suggestions.');
    return output;
  }
);

export async function getFormSuggestions(input: FormAssistantInput): Promise<FormAssistantOutput> {
  try {
    return await formAssistantFlow(input);
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    return {
      suggestions: {},
      explanation: "KI-Vorschläge konnten nicht geladen werden. Bitte prüfen Sie die Verbindung zum KI-Dienst."
    };
  }
}
