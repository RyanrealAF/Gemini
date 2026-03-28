import { useState, useCallback, useRef } from 'react';
import { queryProxy } from './proxy-client';
import type { AIProxyRequest, AIResult, AIError } from './types';

interface UseAIState {
  data: AIResult | null;
  loading: boolean;
  error: AIError | null;
  fromCache: boolean;
}

export function useAI() {
  const [state, setState] = useState<UseAIState>({
    data: null, loading: false, error: null, fromCache: false,
  });
  const ctrlRef = useRef<AbortController | null>(null);

  const query = useCallback(async (req: AIProxyRequest) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const result = await queryProxy(req, ctrl.signal);
      setState({
        data: result,
        loading: false,
        error: null,
        fromCache: result.meta.fromEdge,
      });
      return result;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(s => ({ ...s, loading: false, error: err }));
      }
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    ctrlRef.current?.abort();
    setState(s => ({ ...s, loading: false }));
  }, []);

  return { ...state, query, cancel };
}
