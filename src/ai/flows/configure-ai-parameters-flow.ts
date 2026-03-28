'use server';
/**
 * @fileOverview A Genkit flow to configure AI generation parameters for chat interactions.
 *
 * - configureAIParameters - A function that handles sending chat messages with custom AI generation settings.
 * - ConfigureAIParametersInput - The input type for the configureAIParameters function.
 * - ConfigureAIParametersOutput - The return type for the configureAIParameters function.
 */

import {ai} from '@/ai/genkit';
import {z, Part} from 'genkit';

// Defining the schemas based on the AIProxyRequest structure and user requirements.

const AIMessagePartSchema = z.object({
  text: z.string().describe('The text content of the message part.'),
});

const AIMessageSchema = z.object({
  role: z.enum(['user', 'model']).describe('The role of the message sender.'),
  parts: z.array(AIMessagePartSchema).describe('An array of message parts, each containing text.'),
});

const GenerationConfigSchema = z.object({
  temperature: z.number().min(0).max(1).optional().describe('Controls the randomness of the output. Higher values are more creative.'),
  topP: z.number().min(0).max(1).optional().describe('The maximum cumulative probability of tokens to consider for sampling.'),
  topK: z.number().int().min(1).optional().describe('The maximum number of tokens to consider for sampling.'),
  maxOutputTokens: z.number().int().min(1).optional().describe('The maximum number of tokens to generate in the response.'),
  stopSequences: z.array(z.string()).optional().describe('Sequences where the model should stop generating output.'),
}).optional().describe('Configuration for controlling the AI generation process.');

const SystemInstructionSchema = z.object({
  parts: z.array(AIMessagePartSchema).describe('The system instruction text parts.'),
}).optional().describe('System-level instructions to guide the AI behavior.');

const ConfigureAIParametersInputSchema = z.object({
  contents: z.array(AIMessageSchema).describe('The conversation history, including user and model messages.'),
  generationConfig: GenerationConfigSchema,
  systemInstruction: SystemInstructionSchema,
});
export type ConfigureAIParametersInput = z.infer<typeof ConfigureAIParametersInputSchema>;

const ConfigureAIParametersOutputSchema = z.object({
  text: z.string().describe('The generated text response from the AI.'),
});
export type ConfigureAIParametersOutput = z.infer<typeof ConfigureAIParametersOutputSchema>;

// Exported wrapper function to call the Genkit flow.
export async function configureAIParameters(input: ConfigureAIParametersInput): Promise<ConfigureAIParametersOutput> {
  return configureAIParametersFlow(input);
}

// The Genkit flow definition.
const configureAIParametersFlow = ai.defineFlow(
  {
    name: 'configureAIParametersFlow',
    inputSchema: ConfigureAIParametersInputSchema,
    outputSchema: ConfigureAIParametersOutputSchema,
  },
  async (input) => {
    const chatParts: Part[] = [];

    // Add system instruction if provided
    if (input.systemInstruction && input.systemInstruction.parts.length > 0) {
      chatParts.push({
        text: input.systemInstruction.parts.map(p => p.text).join(' '), // Flatten parts into a single text string
        role: 'system'
      });
    }

    // Add conversation history
    input.contents.forEach(msg => {
      if (msg.parts.length > 0) {
        chatParts.push({
          text: msg.parts.map(p => p.text).join(' '),
          role: msg.role,
        });
      }
    });

    const { output } = await ai.generate({
      model: ai.model('googleai/gemini-2.5-flash'), // Explicitly use the model
      prompt: chatParts,
      config: {
        temperature: input.generationConfig?.temperature,
        topP: input.generationConfig?.topP,
        topK: input.generationConfig?.topK,
        maxOutputTokens: input.generationConfig?.maxOutputTokens,
        stopSequences: input.generationConfig?.stopSequences,
      },
    });

    if (!output || typeof output.text !== 'string') {
      throw new Error('Failed to get a valid text response from the AI.');
    }

    return { text: output.text };
  }
);
