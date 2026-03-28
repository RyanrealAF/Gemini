interface ProxyConfig {
  timeout: number;
  maxRetries: number;
  dedupeWindowMs: number;
}

/**
 * Configuration for the AI Proxy client.
 * Using Next.js compatible environment variables where appropriate.
 */
export const proxyConfig: ProxyConfig = {
  timeout: 30_000,
  maxRetries: 3,
  dedupeWindowMs: 2_000, // collapse identical requests within 2s
};
