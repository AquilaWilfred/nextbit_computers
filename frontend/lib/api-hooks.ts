import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, proxyClient } from './api-client';
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

export function useFetch<T>(path: string, enabled = true): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<T>(path);
      setData(result);
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

  return { data, isLoading, error, refetch: fetchData };
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

  const fetchData = useCallback(async () => {
    if (!shouldFetch()) return;
    
    // If auth is required but not ready, wait for it
    if (requireAuth && (!isInitialized || !user)) {
      await waitForAuth();
      // After waiting, re-check if we should proceed
      if (!shouldFetch()) return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await proxyClient.get<T>(path);
      setData(result);
      hasFetched.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      if (msg.includes('401')) {
        setData(null);
        // Don't set error for 401 - it's expected before auth
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when auth state changes (e.g., after login)
  useEffect(() => {
    if (isInitialized && user && hasFetched.current) {
      fetchData();
    }
  }, [isInitialized, user, fetchData]);

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