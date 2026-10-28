import { useCallback, useEffect, useState } from "react";

type RequestState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
};

/**
 * Runs `load` on mount and whenever `load` changes, so pass a stable function
 * (module-level or wrapped in `useCallback`).
 */
export function useRequest<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<RequestState<T>>({
    data: undefined,
    error: undefined,
    isLoading: true,
    isRefreshing: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setState({
            data,
            error: undefined,
            isLoading: false,
            isRefreshing: false,
          });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            ...previous,
            error: error instanceof Error ? error : new Error(String(error)),
            isLoading: false,
            isRefreshing: false,
          }));
        }
      },
    );

    return () => controller.abort();
  }, [load, attempt]);

  const refresh = useCallback(() => {
    setState((previous) => ({
      ...previous,
      isLoading: previous.data === undefined,
      isRefreshing: previous.data !== undefined,
    }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, refresh };
}
