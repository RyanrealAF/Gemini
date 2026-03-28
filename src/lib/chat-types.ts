export type Role = 'user' | 'model';

export interface MessagePart {
  text: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  parts: MessagePart[];
  timestamp: Date;
  status?: 'sending' | 'error' | 'success';
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

export interface PerformanceMeta {
  cacheStatus: 'HIT' | 'MISS' | 'DYNAMIC';
  latencyMs: number;
}