import { useState, useEffect } from "react";
import { PublicSettings } from "@/types/orders.types";
import { apiFetch } from "@/lib/utils/order.utils";

export function useSettings() {
  const [settings, setSettings] = useState<PublicSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PublicSettings>("/api/settings/public?keys=appearance,general")
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}