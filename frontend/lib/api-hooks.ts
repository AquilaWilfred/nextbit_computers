// lib/api-hooks.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { proxyClient } from './api-client';
import { useAuth } from '@/hooks/auth';

// ---------------------------------------------------------------------------
// useFetch (public data, no auth needed)
// ---------------------------------------------------------------------------

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const _fetchCache = new Map<string, { data: any; ts: number }>();
const _fetchInflight = new Map<string, Promise<any>>();
const FETCH_TTL = 30_000;

async function cachedFetch<T>(path: string): Promise<T> {
  const now = Date.now();
  const hit = _fetchCache.get(path);
  if (hit && now - hit.ts < FETCH_TTL) return hit.data as T;
  const inflight = _fetchInflight.get(path);
  if (inflight) return inflight as Promise<T>;
  const promise = fetch(path, { credentials: 'include' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      _fetchCache.set(path, { data, ts: Date.now() });
      _fetchInflight.delete(path);
      return data as T;
    })
    .catch(err => {
      _fetchInflight.delete(path);
      throw err;
    });
  _fetchInflight.set(path, promise);
  return promise;
}

export function useFetch<T>(path: string, enabled = true): UseFetchResult<T> {
  const memHit = _fetchCache.get(path);
  const [data, setData] = useState<T | null>(memHit?.data ?? null);
  const [isLoading, setIsLoading] = useState(enabled && !memHit);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(!!memHit);

  const fetchData = useCallback(async () => {
    if (!enabled || hasFetched.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await cachedFetch<T>(path);
      setData(result);
      hasFetched.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      if (msg.includes('401')) {
        setData(null);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      hasFetched.current = false;
      _fetchCache.delete(path);
      fetchData();
    }
  };
}

// ---------------------------------------------------------------------------
// useMutation - optimized with stable ref
// ---------------------------------------------------------------------------

interface UseMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput>;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>
): UseMutationResult<TInput, TOutput> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fnRef = useRef(mutationFn);
  useEffect(() => {
    fnRef.current = mutationFn;
  });

  const mutate = useCallback(async (input: TInput): Promise<TOutput> => {
    setIsPending(true);
    setError(null);
    try {
      const result = await fnRef.current(input);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { mutate, mutateAsync: mutate, isPending, error, reset };
}

// ---------------------------------------------------------------------------
// Module-level request cache — shared across ALL hook instances
// Prevents duplicate requests even when multiple components mount simultaneously
const _proxyCache = new Map<string, { data: any; ts: number }>();
const _proxyInflight = new Map<string, Promise<any>>();
const PROXY_TTL = 30_000; // 30 seconds

async function cachedProxyGet<T>(path: string): Promise<T> {
  const now = Date.now();
  const hit = _proxyCache.get(path);
  if (hit && now - hit.ts < PROXY_TTL) return hit.data as T;

  const inflight = _proxyInflight.get(path);
  if (inflight) return inflight as Promise<T>;

  const promise = proxyClient.get<T>(path).then(data => {
    _proxyCache.set(path, { data, ts: Date.now() });
    _proxyInflight.delete(path);
    return data;
  }).catch(err => {
    _proxyInflight.delete(path);
    throw err;
  });

  _proxyInflight.set(path, promise);
  return promise;
}

export function invalidateProxyCache(path: string) {
  _proxyCache.delete(path);
}

// ---------------------------------------------------------------------------
// useProxyFetch - OPTIMIZED: Automatically waits for auth initialization
// For any relative /api/* path that needs cookie auth
// ---------------------------------------------------------------------------

interface UseProxyFetchOptions {
  enabled?: boolean;
  requireAuth?: boolean; // NEW - if true, waits for auth before fetching
}

export function useProxyFetch<T>(
  path: string, 
  options: UseProxyFetchOptions = {}
): UseFetchResult<T> {
  const { enabled = true, requireAuth = true } = options;
  const { isInitialized, user, waitForAuth } = useAuth();
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Determine if we should fetch
  const shouldFetch = useCallback(() => {
    if (!enabled) return false;
    if (!requireAuth) return true;
    return isInitialized && !!user;
  }, [enabled, requireAuth, isInitialized, user]);

  const fetchData = useCallback(async (force = false) => {
    if (!shouldFetch()) return;
    if (hasFetched.current && !force) return;

    if (requireAuth && (!isInitialized || !user)) {
      await waitForAuth();
      if (!shouldFetch()) return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await cachedProxyGet<T>(path);
      setData(result);
      hasFetched.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      if (msg.includes('401')) {
        setData(null);
        if (isInitialized && user) {
          setError('Session expired. Please login again.');
        }
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [path, shouldFetch, requireAuth, isInitialized, user, waitForAuth]);

  // Single effect — fetch once on mount when ready
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when user logs IN (null -> user transition only)
  const prevUserRef = useRef<typeof user>(null);
  useEffect(() => {
    if (isInitialized && user && !prevUserRef.current) {
      hasFetched.current = false;
      fetchData(true);
    }
    prevUserRef.current = user ?? null;
  }, [isInitialized, user]);

  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAuthenticatedQuery - React Query style hook for auth-dependent data
// Use this for endpoints that absolutely require authentication
// ---------------------------------------------------------------------------

interface UseAuthenticatedQueryResult<T> extends UseFetchResult<T> {
  isUnauthorized: boolean;
}

export function useAuthenticatedQuery<T>(path: string, enabled = true): UseAuthenticatedQueryResult<T> {
  const { isInitialized, user, waitForAuth } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const fetchData = useCallback(async () => {
    // Block completely until auth is ready
    if (!isInitialized || !user) {
      if (!isInitialized) {
        setIsLoading(true);
        await waitForAuth();
        setIsLoading(false);
      }
      if (!user) {
        setIsUnauthorized(true);
        return;
      }
    }
    
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);
    
    try {
      const result = await proxyClient.get<T>(path);
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      if (msg.includes('401')) {
        setIsUnauthorized(true);
        setData(null);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [path, enabled, isInitialized, user, waitForAuth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, isUnauthorized };
}