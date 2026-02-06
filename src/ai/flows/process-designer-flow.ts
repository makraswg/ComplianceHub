
'use server';
/**
 * @fileOverview AI Flow for Process Content Engineering (Expert BPMN Architect).
 * 
 * Geduldiger Business-Analyst Flow:
 * - Stellt mindestens 5 gezielte Fragen, bevor strukturelle Änderungen vorgeschlagen werden.
 * - Nutzt einfache Sprache im Chat, aber professionelle Sprache für das Modell.
 * - Berücksichtigt das Feld 'openQuestions' im Stammblatt als Gedächtnis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';
import OpenAI from 'openai';

const ProcessDesignerInputSchema = z.object({
  userMessage: z.string(),
  currentModel: z.any(),
  openQuestions: z.string().optional().describe('Bestehende offene Fragen aus dem Stammblatt.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'ai']),
    text: z.string()
  })).optional(),
  context: z.string().optional(),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
});

export type ProcessDesignerInput = z.infer<typeof ProcessDesignerInputSchema>;

const ProcessDesignerOutputSchema = z.object({
  proposedOps: z.array(z.object({
    type: z.enum(['ADD_NODE', 'UPDATE_NODE', 'REMOVE_NODE', 'ADD_EDGE', 'UPDATE_EDGE', 'REMOVE_EDGE', 'UPDATE_LAYOUT', 'SET_ISO_FIELD', 'REORDER_NODES', 'UPDATE_PROCESS_META']),
    payload: z.any()
  })).describe('Strukturelle Änderungen. Erst nutzen, wenn der Prozess verstanden wurde.'),
  explanation: z.string().describe('Einfache, empathische Antwort im Chat (deutsch).'),
  openQuestions: z.array(z.string()).describe('Die aktuell noch zu klärenden Fragen.'),
});

export type ProcessDesignerOutput = z.infer<typeof ProcessDesignerOutputSchema>;

const SYSTEM_PROMPT = `Du bist ein erfahrener Prozess-Analyst und ISO 9001:2015 Experte.
Deine Aufgabe ist es, einen realen Geschäftsprozess zu verstehen und professionell zu modellieren.

PHASE 1: VERSTEHEN (ERSTE 5-7 NACHRICHTEN)
- Sei geduldig. Schlage KEINE Änderungen am Diagramm vor (proposedOps leer lassen).
- Stelle 1-2 gezielte Fragen zum IST-Zustand.
- Nutze einfache, klare Sprache im Chat (kein Fachchinesisch).
- Beachte die Liste der bereits offenen Fragen: {{{openQuestions}}}.

PHASE 2: MODELLIEREN (ERST WENN DER PROZESS KLAR IST)
- Erzeuge hochprofessionelle Inhalte für das Modell (Titel, Anweisungen, ISO-Felder).
- Nutze 'proposedOps' für die Struktur.
- Pflege das Stammblatt via UPDATE_PROCESS_META { openQuestions: "..." }, um den Fortschritt festzuhalten.

WICHTIGE REGELN:
1. Keine Wiederholungen von Fragen.
2. Wenn du Fragen stellst, schlage IMMER ein UPDATE_PROCESS_META vor, um die 'openQuestions' im Stammblatt zu aktualisieren.
3. Nutze für Knoten-IDs ein 250px Raster.

ANTWORT-FORMAT:
Du MUSST ein valides JSON-Objekt zurückgeben. Antworte NIEMALS mit normalem Text außerhalb des JSON.`;

/**
 * Extrahiert JSON aus einem String, auch wenn dieser Markdown-Wrapper enthält.
 */
function extractJson(text: string): any {
  try {
    // 1. Direkter Parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Suche nach ```json ... ``` oder ``` ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        // 3. Suche nach der ersten { und letzten }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          try {
            return JSON.parse(text.substring(start, end + 1));
          } catch (e3) {
            throw new Error("JSON parsing failed even after extraction attempts.");
          }
        }
      }
    }
    throw e;
  }
}

function normalizeOps(rawOps: any[]): any[] {
  if (!Array.isArray(rawOps)) return [];
  const normalized: any[] = [];
  rawOps.forEach(op => {
    let type = String(op.type || op.action || '').toUpperCase();
    if (!type) return;
    if (type === 'ADD_NODE' && op.payload?.node) {
      normalized.push({ type: 'ADD_NODE', payload: op.payload });
    } else if (type === 'ADD_EDGE' && (op.payload?.edge || op.from)) {
      const e = op.payload?.edge || op;
      normalized.push({ 
        type: 'ADD_EDGE', 
        payload: { edge: { id: e.id || `e-${Math.random().toString(36).substr(2,5)}`, source: e.source || e.from, target: e.target || e.to, label: e.label || '' } } 
      });
    } else {
      normalized.push({ type, payload: op.payload || op });
    }
  });
  return normalized;
}

function normalizeOutput(raw: any): ProcessDesignerOutput {
  return {
    proposedOps: normalizeOps(raw.proposedOps || raw.ops || []),
    explanation: raw.explanation || raw.message || "Ich versuche den Prozess noch besser zu verstehen. Könnten Sie mir folgendes erklären?",
    openQuestions: Array.isArray(raw.openQuestions) ? raw.openQuestions : (raw.questions || [])
  };
}

const processDesignerFlow = ai.defineFlow(
  {
    name: 'processDesignerFlow',
    inputSchema: ProcessDesignerInputSchema,
    outputSchema: ProcessDesignerOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    const historyString = (input.chatHistory || []).map(h => `${h.role}: ${h.text}`).join('\n');
    
    const userMessageCount = (input.chatHistory || []).filter(h => h.role === 'user').length;
    const patienceInstruction = userMessageCount < 5 
      ? "HINWEIS: Du bist in Phase 1. Stelle nur Fragen. Schlage noch KEINE ADD_NODE/UPDATE_NODE Operationen vor, außer UPDATE_PROCESS_META für die Fragenliste."
      : "HINWEIS: Du kannst nun in Phase 2 übergehen und das Modell aktiv mitgestalten.";

    const systemPromptPopulated = SYSTEM_PROMPT
      .replace('{{{openQuestions}}}', input.openQuestions || "Keine offenen Fragen im Stammblatt.");

    const prompt = `${patienceInstruction}

AKTUELLER MODELL-ZUSTAND: 
${JSON.stringify(input.currentModel, null, 2)}

CHAT-VERLAUF:
${historyString}

AKTUELLE NACHRICHT VOM NUTZER: "${input.userMessage}"

Bitte antworte im JSON-Format. Pflege die 'openQuestions' im Stammblatt mit UPDATE_PROCESS_META.`;

    try {
      if (config?.provider === 'openrouter') {
        const client = new OpenAI({ apiKey: config.openrouterApiKey || '', baseURL: 'https://openrouter.ai/api/v1' });
        const response = await client.chat.completions.create({
          model: config.openrouterModel || 'google/gemini-2.0-flash-001',
          messages: [{ role: 'system', content: systemPromptPopulated }, { role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });
        const content = response.choices[0].message.content || '{}';
        return normalizeOutput(extractJson(content));
      }

      const modelIdentifier = config?.provider === 'ollama' 
        ? `ollama/${config.ollamaModel || 'llama3'}` 
        : `googleai/${config?.geminiModel || 'gemini-1.5-flash'}`;

      const { output } = await ai.generate({ model: modelIdentifier, system: systemPromptPopulated, prompt, output: { schema: ProcessDesignerOutputSchema } });
      return normalizeOutput(output || {});
    } catch (e: any) {
      console.error("AI Flow Execution Error:", e);
      throw e;
    }
  }
);

export async function getProcessSuggestions(input: any): Promise<ProcessDesignerOutput> {
  try {
    return await processDesignerFlow(input);
  } catch (error: any) {
    console.error("Public Wrapper Error:", error);
    return { proposedOps: [], explanation: "Entschuldigung, ich hatte ein technisches Problem bei der Analyse. Können wir den letzten Punkt nochmal besprechen?", openQuestions: ["Was genau passiert in diesem Schritt?"] };
  }
}
