
'use server';
/**
 * @fileOverview AI Flow for PDF OCR and Analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiConfig } from '@/app/actions/ai-actions';
import { DataSource } from '@/lib/types';
import OpenAI from 'openai';

const OcrInputSchema = z.object({
  fileDataUri: z.string().describe("PDF or Image data URI."),
  fileName: z.string().optional(),
  dataSource: z.enum(['mysql', 'firestore', 'mock']).optional(),
});

const OcrOutputSchema = z.object({
  extractedText: z.string().describe('The raw text extracted from the document.'),
  summary: z.string().describe('A brief summary of the document content.'),
  confidence: z.number().describe('OCR confidence score 0-100.'),
});

export type OcrOutput = z.infer<typeof OcrOutputSchema>;

const SYSTEM_PROMPT = `You are a high-precision OCR and document analysis engine.
Your task is to extract all visible text from the provided document (PDF or Image) and provide a professional summary.

If the document is a process manual, technical specification or compliance evidence, maintain the professional terminology.
Translate your summary into German.

RESPONSE FORMAT (JSON):
{
  "extractedText": "...",
  "summary": "...",
  "confidence": number
}`;

const ocrFlow = ai.defineFlow(
  {
    name: 'ocrFlow',
    inputSchema: OcrInputSchema,
    outputSchema: OcrOutputSchema,
  },
  async (input) => {
    const config = await getActiveAiConfig(input.dataSource as DataSource);
    
    // Using Gemini 1.5 Flash via OpenRouter or Google AI for multimodal processing
    if (config?.provider === 'openrouter') {
      const client = new OpenAI({
        apiKey: config.openrouterApiKey || '',
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const response = await client.chat.completions.create({
        model: 'google/gemini-2.0-flash-001', // Multimodal support
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: `Analyzing document: ${input.fileName || 'Untitled'}` },
              { type: 'image_url', image_url: { url: input.fileDataUri } }
            ] as any
          }
        ],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}') as OcrOutput;
    }

    // Standard fallback if no multimodal provider is active
    return {
      extractedText: "OCR-Verarbeitung ist für diesen Provider (Ollama) in der Sandbox eingeschränkt. Bitte nutzen Sie Gemini oder OpenRouter für volle Funktionalität.",
      summary: "Eingeschränkter Modus.",
      confidence: 50
    };
  }
);

export async function runOcrAction(input: any): Promise<OcrOutput> {
  try {
    return await ocrFlow(input);
  } catch (error: any) {
    console.error("OCR Error:", error);
    return {
      extractedText: "Fehler bei der Textextraktion.",
      summary: "Der OCR-Dienst ist momentan nicht erreichbar.",
      confidence: 0
    };
  }
}
