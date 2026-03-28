'use server';
/**
 * @fileOverview This file implements a Genkit flow to receive a complete, AI-generated response
 * to a user's message.
 *
 * - receiveBatchAIResponse - A function that handles sending a message to the AI and getting a complete response.
 * - ReceiveBatchAIResponseInput - The input type for the receiveBatchAIResponse function.
 * - ReceiveBatchAIResponseOutput - The return type for the receiveBatchAIResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReceiveBatchAIResponseInputSchema = z.object({
  message: z.string().describe('The user\'s message to the AI.'),
});
export type ReceiveBatchAIResponseInput = z.infer<typeof ReceiveBatchAIResponseInputSchema>;

const ReceiveBatchAIResponseOutputSchema = z.object({
  response: z.string().describe('The complete AI-generated response.'),
});
export type ReceiveBatchAIResponseOutput = z.infer<typeof ReceiveBatchAIResponseOutputSchema>;

export async function receiveBatchAIResponse(input: ReceiveBatchAIResponseInput): Promise<ReceiveBatchAIResponseOutput> {
  return receiveBatchAIResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'receiveBatchAIResponsePrompt',
  input: {schema: ReceiveBatchAIResponseInputSchema},
  output: {schema: ReceiveBatchAIResponseOutputSchema},
  prompt: `You are a helpful AI assistant. Respond to the following message:

Message: {{{message}}}`,
});

const receiveBatchAIResponseFlow = ai.defineFlow(
  {
    name: 'receiveBatchAIResponseFlow',
    inputSchema: ReceiveBatchAIResponseInputSchema,
    outputSchema: ReceiveBatchAIResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
