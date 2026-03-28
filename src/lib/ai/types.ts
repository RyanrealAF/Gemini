/**
 * Gemini-native message format - core types for AI interactions.
 */
export interface AIMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface AIProxyRequest {
  contents: AIMessage[];
  stream?: boolean;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  systemInstruction?: {
    parts: { text: string }[];
  };
}

export interface AIProxyResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Metadata extracted from response headers or local execution.
 */
export interface ProxyMeta {
  cacheStatus: 'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS' | 'DYNAMIC' | string;
  latencyMs: number;
  fromEdge: boolean;
}

export interface AIResult {
  text: string;
  raw?: AIProxyResponse;
  meta: ProxyMeta;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

export interface AIError {
  status: number;
  message: string;
  retryable: boolean;
}
