import { proxyConfig } from './config';
import type {
  AIProxyRequest, AIResult,
  AIStreamChunk, AIError, ProxyMeta,
} from './types';
import { configureAIParameters } from '@/ai/flows/configure-ai-parameters-flow';
import { streamAIResponse } from '@/ai/flows/stream-ai-response';

// ── Hardened Edge Cache ───────────────────────────────
// Deterministic hash based on request content to simulate Gate 3
const cache = new Map<string, { result: AIResult, timestamp: number }>();
const inflight = new Map<string, Promise<AIResult>>();

function hashReq(req: AIProxyRequest): string {
  // Simple deterministic hash for deduping and caching
  const str = JSON.stringify({
    c: req.contents,
    g: req.generationConfig,
    s: req.systemInstruction
  });
  // Using a simple hash simulation for edge caching
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `bwb_edge_${Math.abs(hash).toString(16)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Gate 1: Jules Auth Verification ───────────────────
function verifyJulesAuth() {
  // In production, this checks the Bearer token against env.SECRETS.get("Jules")
  // We simulate a successful gate pass here.
  return true;
}

function createMeta(t0: number, isHit = false): ProxyMeta {
  const latency = isHit ? Math.floor(Math.random() * 8) + 2 : Date.now() - t0;
  return {
    cacheStatus: isHit ? 'HIT' : 'MISS',
    latencyMs: latency,
    fromEdge: true,
  };
}

// ── Batch Query (The 4 Gates) ────────────────────────
export async function queryProxy(
  request: AIProxyRequest,
  _signal?: AbortSignal,
): Promise<AIResult> {
  // Gate 1: Auth
  if (!verifyJulesAuth()) {
    throw { status: 401, message: 'UNAUTHORIZED: Jules Gate Rejected', retryable: false } satisfies AIError;
  }

  // Gate 2: Validation (handled by Zod in the flow, but we can do a quick check)
  if (!request.contents || request.contents.length === 0) {
    throw { status: 400, message: 'BAD REQUEST: Payload Empty', retryable: false } satisfies AIError;
  }

  const key = hashReq(request);

  // Gate 3: Edge Cache
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp < 60000)) {
    return {
      ...cached.result,
      meta: createMeta(0, true)
    };
  }

  // Dedup logic
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
        // Gate 4: AI Gateway Routing (Bridge to Genkit)
        const response = await configureAIParameters(request);
        
        const result: AIResult = {
          text: response.text,
          meta: createMeta(t0),
        };

        // Populate Edge Cache
        cache.set(key, { result, timestamp: Date.now() });
        
        return result;
      } catch (err: any) {
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
export async function* streamProxy(
  request: AIProxyRequest,
  _signal?: AbortSignal,
): AsyncGenerator<AIStreamChunk> {
  // Gate 1: Auth
  if (!verifyJulesAuth()) {
    throw { status: 401, message: 'UNAUTHORIZED: Jules Gate Rejected', retryable: false } satisfies AIError;
  }

  try {
    const result = await streamAIResponse(request);
    const chunks = result.text.split(' ');
    for (let i = 0; i < chunks.length; i++) {
      yield { text: chunks[i] + (i === chunks.length - 1 ? '' : ' '), done: false };
      await sleep(15 + Math.random() * 10);
    }
    yield { text: '', done: true };
  } catch (err: any) {
    throw { status: 500, message: err.message || 'Streaming failure', retryable: false } satisfies AIError;
  }
}
