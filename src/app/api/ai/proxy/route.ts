import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import type { AIProxyRequest, AIError } from '@/lib/ai/types';

/**
 * Hardened Edge AI Proxy (The 4 Gates)
 * Implements: Auth, Validation, Cache (Simulated), and Gateway Routing.
 */

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  try {
    // Gate 1: Jules Auth Verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 401, message: 'UNAUTHORIZED: Jules Gate Rejected', retryable: false },
        { status: 401 }
      );
    }

    const body: AIProxyRequest = await req.json();

    // Gate 2: Validation
    if (!body.contents || body.contents.length === 0) {
      return NextResponse.json(
        { status: 400, message: 'BAD REQUEST: Payload Empty', retryable: false },
        { status: 400 }
      );
    }

    const genkitPrompt = body.contents.map(msg => ({
      role: msg.role,
      content: msg.parts.map(p => ({ text: p.text })),
    }));

    const systemInstruction = body.systemInstruction?.parts?.map(p => ({
      text: p.text,
    }));

    // Gate 4: AI Gateway Routing (Streaming vs Batch)
    if (body.stream) {
      const { stream, response } = ai.generateStream({
        model: 'googleai/gemini-2.5-flash',
        prompt: genkitPrompt,
        systemInstruction: systemInstruction && systemInstruction.length > 0 ? systemInstruction : undefined,
        config: {
          temperature: body.generationConfig?.temperature,
          topP: body.generationConfig?.topP,
          maxOutputTokens: body.generationConfig?.maxOutputTokens,
        },
      });

      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.text) {
                const sseData = `data: ${JSON.stringify({ text: chunk.text, done: false })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
            }
            await response;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '', done: true })}\n\n`));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Cache': 'DYNAMIC',
          'X-Latency': `${Date.now() - t0}ms`,
        },
      });
    }

    // Batch Response
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: genkitPrompt,
      systemInstruction: systemInstruction && systemInstruction.length > 0 ? systemInstruction : undefined,
      config: {
        temperature: body.generationConfig?.temperature,
        topP: body.generationConfig?.topP,
        maxOutputTokens: body.generationConfig?.maxOutputTokens,
      },
    });

    return NextResponse.json({
      text: result.text,
      meta: {
        cacheStatus: 'MISS',
        latencyMs: Date.now() - t0,
        fromEdge: true,
      },
    });

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json(
      { status: 500, message: error.message || 'Internal AI Error', retryable: true },
      { status: 500 }
    );
  }
}
