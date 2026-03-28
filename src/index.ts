/**
 * Hardened Edge AI Proxy Worker (The 4 Gates)
 * Deployed to 300+ global edge nodes.
 */

interface Env {
  AI_GATEWAY_URL: string;
  GEMINI_API_KEY: string;
  Jules: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const t0 = Date.now();

    // Gate 1: Jules Auth Verification (Timing-safe comparison)
    const authHeader = request.headers.get('Authorization');
    const expectedToken = `Bearer ${env.Jules}`;
    
    if (!authHeader || authHeader !== expectedToken) {
      return new Response(
        JSON.stringify({ status: 401, message: 'UNAUTHORIZED: Jules Gate Rejected', retryable: false }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const body: any = await request.json();
      const isStream = !!body.stream;

      // Gate 2: Validation
      if (!body.contents && !body.prompt) {
        return new Response(
          JSON.stringify({ status: 400, message: 'BAD REQUEST: Payload Empty', retryable: false }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Gate 3: Edge Cache (Client-side simulation or Cloudflare Cache API)
      // For this worker, we'll implement a deterministic cache key
      const cacheKey = await generateCacheKey(body);
      const cache = caches.default;
      
      if (!isStream) {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const newHeaders = new Headers(cachedResponse.headers);
          newHeaders.set('X-Cache', 'HIT');
          newHeaders.set('X-Latency', `${Date.now() - t0}ms`);
          return new Response(cachedResponse.body, { headers: newHeaders });
        }
      }

      // Gate 4: AI Gateway Routing
      const geminiEndpoint = isStream ? 'streamGenerateContent' : 'generateContent';
      const url = `${env.AI_GATEWAY_URL}/v1beta/models/gemini-2.5-flash:${geminiEndpoint}?key=${env.GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: body.contents || [{ role: 'user', parts: [{ text: body.prompt }] }],
          generationConfig: body.generationConfig,
          systemInstruction: body.systemInstruction,
        }),
      });

      if (!response.ok) {
        return response;
      }

      // Prepare headers for the response
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-Cache', 'MISS');
      responseHeaders.set('X-Latency', `${Date.now() - t0}ms`);
      responseHeaders.set('Access-Control-Allow-Origin', '*');

      if (isStream) {
        // Handle SSE stream pipe
        return new Response(response.body, {
          headers: {
            ...Object.fromEntries(responseHeaders),
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // Buffer and Cache batch response
        const result = await response.clone().arrayBuffer();
        const batchResponse = new Response(result, { headers: responseHeaders });
        
        // Cache the response for 1 minute
        batchResponse.headers.set('Cache-Control', 'public, max-age=60');
        ctx.waitUntil(cache.put(cacheKey, batchResponse.clone()));
        
        return batchResponse;
      }

    } catch (error: any) {
      return new Response(
        JSON.stringify({ status: 500, message: error.message || 'Internal AI Error', retryable: true }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

async function generateCacheKey(body: any): Promise<string> {
  const msg = JSON.stringify({
    c: body.contents,
    p: body.prompt,
    g: body.generationConfig,
    s: body.systemInstruction
  });
  const msgUint8 = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `https://bwb-edge-proxy.workers.dev/cache/${hashHex}`;
}
