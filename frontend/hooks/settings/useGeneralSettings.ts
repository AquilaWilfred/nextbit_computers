// hooks/settings/useGeneralSettings.ts
import { useState, useEffect } from "react";
import { GeneralSettings } from "@/types/settings.types";
import { settingsService } from "@/lib/services/settings.service";
import { DEFAULT_FEATURES } from "@/constants/settings.constants";

export function useGeneralSettings() {
  const [settings, setSettings] = useState<GeneralSettings>(() => {
    const cached = settingsService.getCachedSettings();
    return cached?.general ?? {};
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip if already populated from cache
    if (Object.keys(settings).length > 0) return;

    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await settingsService.fetchPublicSettings();
        settingsService.cacheSettings(data);
        setSettings(data.general ?? {});
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [settings]); // Only run if settings is empty

  const getFeatures = () => {
    return settings.features?.length ? settings.features : DEFAULT_FEATURES;
  };

  const getStoreName = () => {
    return settings.storeName || "Store";
  };

  const getStoreDescription = () => {
    return settings.storeDescription || "Your premier destination for cutting-edge technology.";
  };

  return {
    settings,
    isLoading,
    error,
    getFeatures,
    getStoreName,
    getStoreDescription,
  };
}