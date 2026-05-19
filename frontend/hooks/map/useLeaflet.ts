// hooks/useLeaflet.ts
import { useState, useEffect } from "react";
import { LEAFLET_CSS_URL, LEAFLET_JS_URL } from "@/constants/mapConstants";
import { ensureLeafletCSS, injectMapStyles } from "@/lib/utils/mapStyles";

declare global {
  interface Window {
    L?: any;
  }
}

const loadLeafletScript = async (): Promise<any> => {
  if (typeof window === "undefined") {
    throw new Error("Leaflet can only be loaded in the browser");
  }
  if (window.L) return window.L;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);
    if (existing) {
      if ((existing as HTMLScriptElement).getAttribute("data-loaded") === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });

  if (!window.L) {
    throw new Error("Leaflet failed to initialize");
  }
  return window.L;
};

export function useLeaflet() {
  const [L, setL] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        ensureLeafletCSS();
        injectMapStyles();
        const leaflet = await loadLeafletScript();
        if (mounted) {
          setL(leaflet);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return { L, loading, error };
}