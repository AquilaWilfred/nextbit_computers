import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { getGuestCart } from "@/lib/cart";

export function useCartCount(isAuthenticated: boolean, authCartCount: number = 0) {
  const [guestCount, setGuestCount] = useState(0);

  useEffect(() => {
    const update = () => setGuestCount(getGuestCart().length);
    update();
    window.addEventListener("storage", update);
    window.addEventListener("guestCartUpdated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("guestCartUpdated", update);
    };
  }, []);

  return isAuthenticated ? authCartCount : guestCount;
}