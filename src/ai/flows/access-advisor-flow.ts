
'use server';
/**
 * @fileOverview AI Access Advisor Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';
import OpenAI from 'openai';

const AccessAdvisorInputSchema = z.object({
  userDisplayName: z.string(),
  userEmail: z.string(),
  department: z.string(),
  assignments: z.array(z.object({
    resourceName: z.string(),
    entitlementName: z.string(),
    riskLevel: z.string(),
  })),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
});

export type AccessAdvisorInput = z.infer<typeof AccessAdvisorInputSchema>;

const AccessAdvisorOutputSchema = z.object({
  riskScore: z.number().describe('A score from 0-100 indicating access risk.'),
  summary: z.string().describe('A brief overview of the user\'s access profile.'),
  concerns: z.array(z.string()).describe('Specific high-risk areas identified.'),
  recommendations: z.array(z.string()).describe('Actionable steps to improve security.'),
});

export type AccessAdvisorOutput = z.infer<typeof AccessAdvisorOutputSchema>;

const SYSTEM_PROMPT = `You are an expert Identity and Access Management (IAM) security advisor.
Analyze the following user's access profile and provide a professional risk assessment.

Identify if there are too many high-risk permissions, if the access matches the department (Principle of Least Privilege), and suggest revoking stale or unnecessary access.
Return your response as a valid JSON object matching this schema:
{
  "riskScore": number,
  "summary": string,
  "concerns": string[],
  "recommendations": string[]
}`;

/**
 * The main Flow definition for Access Advice.
 */
const accessAdvisorFlow = ai.defineFlow(
  {
    name: 'accessAdvisorFlow',
    inputSchema: AccessAdvisorInputSchema,
    outputSchema: AccessAdvisorOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    
    const assignmentsList = input.assignments
      .map(a => `- Resource: ${a.resourceName}, Entitlement: ${a.entitlementName}, Risk: ${a.riskLevel}`)
      .join('\n');

    const prompt = `User: ${input.userDisplayName} (${input.userEmail})
Department: ${input.department}

Current Assignments:
${assignmentsList}`;

    // Handling OpenRouter directly via OpenAI SDK for better stability
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
      if (!content) throw new Error('AI failed to generate advice via OpenRouter.');
      return JSON.parse(content) as AccessAdvisorOutput;
    }

    // Standard Genkit handling for other providers
    const modelIdentifier = config?.provider === 'ollama' 
      ? `ollama/${config.ollamaModel || 'llama3'}` 
      : `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;

    const { output } = await ai.generate({
      model: modelIdentifier,
      system: SYSTEM_PROMPT,
      prompt,
      output: { schema: AccessAdvisorOutputSchema }
    });

    if (!output) throw new Error('AI failed to generate advice.');
    return output;
  }
);

/**
 * Public wrapper function to call the flow.
 */
export async function getAccessAdvice(input: AccessAdvisorInput): Promise<AccessAdvisorOutput> {
  try {
    return await accessAdvisorFlow(input);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return {
      riskScore: 50,
      summary: "Fehler bei der KI-Analyse. Bitte prüfen Sie die Verbindung zum KI-Provider in den Einstellungen.",
      concerns: ["Verbindung zum KI-Dienst fehlgeschlagen"],
      recommendations: ["KI-Einstellungen in der Konsole prüfen", "Manueller Review erforderlich"]
    };
  }
}
