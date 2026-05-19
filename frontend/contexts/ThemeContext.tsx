"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useFetch } from "@/lib/api-hooks";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark" | "system";

interface AppSettings {
  appearance?: {
    primaryColor?: string;
    secondaryColor?: string;
    promoBannerColor?: string;
    userTheme?: Theme;
    adminTheme?: Theme;
  };
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  cycleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const location = usePathname();

  // ✅ FIX: Never read localStorage during render/SSR — start with defaultTheme,
  // then hydrate from localStorage in useEffect (client-only, after mount).
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Hydrate from localStorage after mount (client only)
  useEffect(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored) setTheme(stored);
    }
  }, [switchable]);

  const { data: settings } = useFetch<AppSettings>('/api/settings/public');

  useEffect(() => {
    if (settings?.appearance) {
      const { primaryColor, secondaryColor, promoBannerColor, userTheme, adminTheme } =
        settings.appearance;
      const root = document.documentElement;
      if (primaryColor) root.style.setProperty('--brand', primaryColor);
      if (secondaryColor) root.style.setProperty('--brand-secondary', secondaryColor);
      if (promoBannerColor) root.style.setProperty('--promo-banner', promoBannerColor);
      const isAdmin = location.startsWith('/admin');
      const targetTheme = isAdmin ? (adminTheme || "light") : (userTheme || "light");
      setTheme(targetTheme);
    }
  }, [settings, location]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: Theme) => {
      const resolved =
        t === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : t;
      root.classList.toggle("dark", resolved === "dark");
    };

    applyTheme(theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => setTheme((prev) => (prev === "light" ? "dark" : "light"))
    : undefined;

  const cycleTheme = switchable
    ? () => setTheme((prev) => (prev === "system" ? "light" : prev === "light" ? "dark" : "system"))
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, cycleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
