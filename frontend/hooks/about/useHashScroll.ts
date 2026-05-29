// hooks/useHashScroll.ts
import { useEffect } from "react";

export function useHashScroll(delay: number = 100) {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const timer = setTimeout(() => {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);
}