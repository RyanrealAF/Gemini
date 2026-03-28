import { useState, useCallback, useRef } from 'react';
import { streamProxy } from './proxy-client';
import type { AIProxyRequest, AIError } from './types';

interface UseAIStreamState {
  text: string;
  streaming: boolean;
  error: AIError | null;
}

export function useAIStream() {
  const [state, setState] = useState<UseAIStreamState>({
    text: '', streaming: false, error: null,
  });
  const ctrlRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (req: AIProxyRequest) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    setState({ text: '', streaming: true, error: null });

    try {
      let accumulatedText = '';
      for await (const chunk of streamProxy(req, ctrl.signal)) {
        if (chunk.done) break;
        accumulatedText += chunk.text;
        setState(s => ({ ...s, text: accumulatedText }));
      }
      setState(s => ({ ...s, streaming: false }));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(s => ({ ...s, streaming: false, error: err as AIError }));
      }
    }
  }, []);

  const stop = useCallback(() => {
    ctrlRef.current?.abort();
    setState(s => ({ ...s, streaming: false }));
  }, []);

  return { ...state, stream, stop };
}
