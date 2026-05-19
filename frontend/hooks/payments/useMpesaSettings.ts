import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MpesaSettings } from "@/types/pay.types";
import { DEFAULT_MPESA_SETTINGS } from "@/constants/pay.constants";
import { apiFetch } from "@/lib/utils/pay.utils";

export function useMpesaSettings() {
  const [settings, setSettings] = useState<MpesaSettings>(DEFAULT_MPESA_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MpesaSettings>("/api/admin/settings/mpesa_b2c")
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = useCallback(<K extends keyof MpesaSettings>(key: K, value: MpesaSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings/mpesa_b2c", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      toast.success("M-Pesa settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return {
    settings,
    saving,
    loading,
    updateSetting,
    saveSettings,
  };
}