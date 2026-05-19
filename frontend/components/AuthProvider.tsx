"use client";
import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useMutation } from '@/lib/api-hooks';
import { proxyClient } from '@/lib/api-client';
import { getGuestCart, clearGuestCart } from '@/lib/cart';
import { toast } from 'sonner';
import StoreLoader from '@/components/StoreLoader';
import { useCartSync } from '@/components/CartSyncContext';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(true);
  const wasAuthenticated = useRef(false);
  const authReadyResolvers = useRef<Array<() => void>>([]);
  const { startSync, endSync } = useCartSync();

  const waitForAuth = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (isInitialized) {
        resolve();
      } else {
        authReadyResolvers.current.push(resolve);
      }
    });
  }, [isInitialized]);

  const refetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await proxyClient.get<any>('/api/auth/me');
      setUser(data ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
      setIsInitialized(true);
      authReadyResolvers.current.forEach(resolve => resolve());
      authReadyResolvers.current = [];
    }
  }, []);

  const { mutate: syncCartMutate } = useMutation(
    (items: any[]) => proxyClient.post('/api/cart/sync-from-guest', items)
  );

  useEffect(() => {
    if (user && !wasAuthenticated.current) {
      const guestItems = getGuestCart();
      if (guestItems.length > 0) {
        startSync();
        syncCartMutate(guestItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })))
          .then(() => {
            endSync();
            clearGuestCart();
            window.dispatchEvent(new Event("guestCartUpdated"));
            toast.info(`${guestItems.length} item(s) merged into your cart.`);
          })
          .catch(() => { endSync(); });
      }
      wasAuthenticated.current = true;
    } else if (!user) {
      wasAuthenticated.current = false;
    }
  }, [user, syncCartMutate, startSync, endSync]);

  useEffect(() => {
    const handleAuthChange = () => refetchUser();
    window.addEventListener("userAuthChanged", handleAuthChange);
    return () => window.removeEventListener("userAuthChanged", handleAuthChange);
  }, [refetchUser]);

  const { mutate: logoutMutate } = useMutation(
    () => proxyClient.post('/api/auth/logout')
  );

  const logout = () => {
    logoutMutate(undefined).then(() => {
      setUser(null);
      toast.success("Logged out successfully");
      window.dispatchEvent(new Event("userAuthChanged"));
    });
  };

  const value: AuthContextType = { 
    user, 
    isAuthenticated: !!user, 
    loading, 
    isInitialized,
    logout, 
    refetchUser,
    waitForAuth
  };

  // Block rendering until auth is ready
  if (loading || !isInitialized) {
    return <StoreLoader fullScreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}