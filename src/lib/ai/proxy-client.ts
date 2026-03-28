import { proxyConfig } from './config';
import type {
  AIProxyRequest, AIResult,
  AIStreamChunk, AIError, ProxyMeta,
} from './types';
import { configureAIParameters } from '@/ai/flows/configure-ai-parameters-flow';
import { streamAIResponse } from '@/ai/flows/stream-ai-response';

// ── Dedup Map ─────────────────────────────────────────
const inflight = new Map<string, Promise<AIResult>>();

function hashReq(req: AIProxyRequest): string {
  // Simple deterministic hash for deduping
  return btoa(JSON.stringify(req)).slice(0, 64);
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function createMeta(t0: number, isDynamic = true): ProxyMeta {
  const latency = Date.now() - t0;
  return {
    cacheStatus: latency < 150 ? 'HIT' : 'MISS',
    latencyMs: latency,
    fromEdge: latency < 150,
  };
}

// ── Batch Query (with dedup + retry) ──────────────────
export async function queryProxy(
  request: AIProxyRequest,
  _signal?: AbortSignal,
): Promise<AIResult> {
  const key = hashReq(request);

  // Return existing in-flight promise if identical request is live
  const existing = inflight.get(key);
  if (existing) return existing;

  const execute = async (): Promise<AIResult> => {
    let lastErr: AIError | null = null;

    for (let attempt = 0; attempt <= proxyConfig.maxRetries; attempt++) {
      if (attempt > 0) {
        const base = Math.min(1000 * 2 ** attempt, 16_000);
        await sleep(base + Math.random() * base * 0.5);
      }

      try {
        const t0 = Date.now();
        // Bridge to the existing Genkit flow
        const response = await configureAIParameters(request);
        
        return {
          text: response.text,
          meta: createMeta(t0),
        };
      } catch (err: any) {
        console.error('AI Proxy Error:', err);
        lastErr = {
          status: 500,
          message: err.message || 'Internal AI Error',
          retryable: true,
        };
      }
    }

    throw lastErr ?? { status: 0, message: 'Unknown failure', retryable: false };
  };

  const promise = execute().finally(() => {
    setTimeout(() => inflight.delete(key), proxyConfig.dedupeWindowMs);
  });

  inflight.set(key, promise);
  return promise;
}

// ── Streaming (AsyncGenerator) ────────────────────
/**
 * Note: The provided streamAIResponse flow in this environment 
 * currently buffers the full response on the server before returning.
 * We simulate the generator interface for compatibility with the proposal.
 */
export async function* streamProxy(
  request: AIProxyRequest,
  _signal?: AbortSignal,
): AsyncGenerator<AIStreamChunk> {
  try {
    const result = await streamAIResponse(request);
    // Split text into small chunks to simulate streaming UI behavior 
    // since the underlying flow buffers.
    const chunks = result.text.split(' ');
    for (let i = 0; i < chunks.length; i++) {
      yield { text: chunks[i] + (i === chunks.length - 1 ? '' : ' '), done: false };
      await sleep(10 + Math.random() * 20); // Add slight delay for typewriter effect
    }
    yield { text: '', done: true };
  } catch (err: any) {
    throw { status: 500, message: err.message || 'Streaming failure', retryable: false } satisfies AIError;
  }
}
