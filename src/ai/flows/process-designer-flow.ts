
'use server';
/**
 * @fileOverview AI Flow for Process Vibecoding.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';
import OpenAI from 'openai';

const ProcessDesignerInputSchema = z.object({
  userMessage: z.string(),
  currentModel: z.any(),
  context: z.string().optional(),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
});

const ProcessDesignerOutputSchema = z.object({
  proposedOps: z.array(z.object({
    type: z.enum(['ADD_NODE', 'UPDATE_NODE', 'REMOVE_NODE', 'ADD_EDGE', 'UPDATE_EDGE', 'REMOVE_EDGE', 'UPDATE_LAYOUT']),
    payload: z.any()
  })).describe('Structured list of operations to modify the model.'),
  explanation: z.string().describe('Natural language explanation of what changed and why.'),
  openQuestions: z.array(z.string()).describe('Questions to the user to clarify the process flow.'),
});

export type ProcessDesignerOutput = z.infer<typeof ProcessDesignerOutputSchema>;

const SYSTEM_PROMPT = `You are an expert BPMN Process Architect and ISO 9001 Consultant.
Your task is to translate user instructions into structural patches for a semantic process model.

NODE TYPES:
- 'start': Circle, green. Use once at the beginning.
- 'end': Circle, red. Use at the end points.
- 'step': Rectangle. Normal activity.
- 'decision': Rhombus. Branching point (e.g., "Approval successful?").

EDGE LOGIC:
- Always connect nodes using ADD_EDGE { edge: { id, source, target, label } }.
- For decisions, always provide at least two outgoing edges with labels like "Ja" and "Nein".

STRATEGY:
1. When the user describes a process, identify the nodes and the flow (edges).
2. If branching occurs, use a 'decision' node.
3. Automatically suggest logical coordinates in UPDATE_LAYOUT (Grid based, steps of 200px horizontal, 150px vertical).
4. Do not overwrite the entire model unless requested. Only propose minimal changes (ADD/UPDATE).
5. Always maintain a logical path from 'start' to an 'end' node.

JSON ONLY RESPONSE. Use German for titles and explanations.`;

const processDesignerFlow = ai.defineFlow(
  {
    name: 'processDesignerFlow',
    inputSchema: ProcessDesignerInputSchema,
    outputSchema: ProcessDesignerOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    
    const prompt = `Nutzer-Anweisung: "${input.userMessage}"
Aktueller Modell-Zustand: ${JSON.stringify(input.currentModel)}
Zusätzlicher Kontext: ${input.context || 'Keiner'}`;

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
      if (!content) throw new Error('AI failed via OpenRouter.');
      return JSON.parse(content) as ProcessDesignerOutput;
    }

    const modelIdentifier = config?.provider === 'ollama' 
      ? `ollama/${config.ollamaModel || 'llama3'}` 
      : `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;

    const { output } = await ai.generate({
      model: modelIdentifier,
      system: SYSTEM_PROMPT,
      prompt,
      output: { schema: ProcessDesignerOutputSchema }
    });

    if (!output) throw new Error('AI failed.');
    return output;
  }
);

export async function getProcessSuggestions(input: any): Promise<ProcessDesignerOutput> {
  try {
    return await processDesignerFlow(input);
  } catch (error: any) {
    console.error("Process AI Error:", error);
    return {
      proposedOps: [],
      explanation: "Fehler bei der KI-Generierung. Bitte Verbindung prüfen.",
      openQuestions: ["Können Sie die Nachricht erneut senden?"]
    };
  }
}
