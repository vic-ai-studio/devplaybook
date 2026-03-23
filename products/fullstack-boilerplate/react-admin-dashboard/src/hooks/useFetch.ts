import { useState, useEffect, useCallback, useRef } from "react";

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

interface UseFetchOptions {
  /** Skip the initial fetch */
  skip?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Cache key — if provided, results are cached in memory */
  cacheKey?: string;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions = {}
): FetchState<T> & { refetch: () => Promise<void> } {
  const { skip = false, refetchInterval, headers, cacheKey } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: !skip && !!url,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    // Check cache
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState({ data: cached.data as T, error: null, isLoading: false });
        return;
      }
    }

    // Abort previous request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = localStorage.getItem("admin_auth");
      const authToken = token ? JSON.parse(token).token : null;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as T;

      // Update cache
      if (cacheKey) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      if (!controller.signal.aborted) {
        setState({ data, error: null, isLoading: false });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return; // Ignore aborted requests
      }
      if (!controller.signal.aborted) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
        });
      }
    }
  }, [url, cacheKey, headers]);

  // Initial fetch
  useEffect(() => {
    if (!skip && url) {
      fetchData();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData, skip, url]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || skip || !url) return;

    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, fetchData, skip, url]);

  return { ...state, refetch: fetchData };
}

/**
 * Invalidate cached data by key pattern
 */
export function invalidateCache(keyPattern?: string) {
  if (!keyPattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
    }
  }
}
