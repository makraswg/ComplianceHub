'use server';
/**
 * @fileOverview AI Access Advisor Flow.
 * 
 * This flow analyzes a user's current entitlements and assignments within a tenant
 * to provide a risk assessment and recommendations for access optimization.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AccessAdvisorInputSchema = z.object({
  userDisplayName: z.string(),
  userEmail: z.string(),
  department: z.string(),
  assignments: z.array(z.object({
    resourceName: z.string(),
    entitlementName: z.string(),
    riskLevel: z.string(),
  })),
});

export type AccessAdvisorInput = z.infer<typeof AccessAdvisorInputSchema>;

const AccessAdvisorOutputSchema = z.object({
  riskScore: z.number().describe('A score from 0-100 indicating access risk.'),
  summary: z.string().describe('A brief overview of the user\'s access profile.'),
  concerns: z.array(z.string()).describe('Specific high-risk areas identified.'),
  recommendations: z.array(z.string()).describe('Actionable steps to improve security.'),
});

export type AccessAdvisorOutput = z.infer<typeof AccessAdvisorOutputSchema>;

const advisorPrompt = ai.definePrompt({
  name: 'accessAdvisorPrompt',
  input: { schema: AccessAdvisorInputSchema },
  output: { schema: AccessAdvisorOutputSchema },
  prompt: `You are an expert Identity and Access Management (IAM) security advisor.
Analyze the following user's access profile and provide a professional risk assessment.

User: {{{userDisplayName}}} ({{{userEmail}}})
Department: {{{department}}}

Current Assignments:
{{#each assignments}}
- Resource: {{{this.resourceName}}}, Entitlement: {{{this.entitlementName}}}, Risk: {{{this.riskLevel}}}
{{/each}}

Identify if there are too many high-risk permissions, if the access matches the department (Principle of Least Privilege), and suggest revoking stale or unnecessary access.`,
});

export async function getAccessAdvice(input: AccessAdvisorInput): Promise<AccessAdvisorOutput> {
  const { output } = await advisorPrompt(input);
  if (!output) throw new Error('AI failed to generate advice.');
  return output;
}
