import { proxyConfig } from './config';
import type {
  AIProxyRequest, AIResult,
  AIStreamChunk, AIError, ProxyMeta,
} from './types';

// ── Hardened Edge Cache (Client Simulation) ──────────
const cache = new Map<string, { result: AIResult, timestamp: number }>();

function hashReq(req: AIProxyRequest): string {
  const str = JSON.stringify({
    c: req.contents,
    g: req.generationConfig,
    s: req.systemInstruction
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `bwb_edge_${Math.abs(hash).toString(16)}`;
}

// ── Gate 1: Jules Auth Verification ───────────────────
const JULES_TOKEN = "your-jules-token-here"; // This matches your simulated VITEJULESTOKEN

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${JULES_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// ── Batch Query ────────────────────────
export async function queryProxy(
  request: AIProxyRequest,
  signal?: AbortSignal,
): Promise<AIResult> {
  const key = hashReq(request);
  const cached = cache.get(key);
  
  if (cached && (Date.now() - cached.timestamp < 60000)) {
    return {
      ...cached.result,
      meta: { cacheStatus: 'HIT', latencyMs: 5, fromEdge: true }
    };
  }

  const response = await fetch('/api/ai/proxy', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...request, stream: false }),
    signal,
  });

  if (!response.ok) {
    const err: AIError = await response.json();
    throw err;
  }

  const result: AIResult = await response.json();
  cache.set(key, { result, timestamp: Date.now() });
  return result;
}

// ── Streaming (Real SSE Implementation) ────────────────
export async function* streamProxy(
  request: AIProxyRequest,
  signal?: AbortSignal,
): AsyncGenerator<AIStreamChunk> {
  const response = await fetch('/api/ai/proxy', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  });

  if (!response.ok) {
    const err: AIError = await response.json();
    throw err;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('Failed to open stream reader');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.replace('data: ', '');
        try {
          const data = JSON.parse(jsonStr);
          yield data;
          if (data.done) return;
        } catch (e) {
          // Fragmented JSON, ignore
        }
      }
    }
  }
}
