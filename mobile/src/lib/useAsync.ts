import { useCallback, useEffect, useRef, useState } from "react";

/** Runs an async loader, tracks loading/error, and can be re-run (pull to refresh, retry). */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useRef(0);

  const load = useCallback(async () => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loader();
      if (id === run.current) setData(result);
    } catch (e) {
      if (id === run.current) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (id === run.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}
