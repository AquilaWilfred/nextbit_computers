import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AiSettings } from '@/types/ai.types';
import { DEFAULT_SETTINGS } from '@/constants/ai.constants';

async function getSetting<T>(key: string): Promise<T> {
  const res = await fetch(`/api/admin/settings/${key}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function updateSetting(key: string, value: unknown): Promise<void> {
  const res = await fetch(`/api/admin/settings/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [knowledge, setKnowledge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);

  // Load settings on mount
  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      try {
        const [settingsData, knowledgeData] = await Promise.all([
          getSetting<AiSettings>("ai"),
          getSetting<string>("ai_knowledge"),
        ]);
        
        if (!isMounted) return;
        
        setSettings(prev => ({
          ...prev,
          ...settingsData,
          systemPrompt: settingsData.systemPrompt?.replace(/\bNexus\b/gi, "our") || prev.systemPrompt,
        }));
        setKnowledge(knowledgeData ?? "");
      } catch (error) {
        console.error('Failed to load AI settings:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    load();
    return () => { isMounted = false; };
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      await updateSetting("ai", settings);
      toast.success("AI settings saved successfully");
      return true;
    } catch {
      toast.error("Failed to save AI settings");
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const saveKnowledge = useCallback(async () => {
    setSavingKnowledge(true);
    try {
      await updateSetting("ai_knowledge", knowledge);
      toast.success("Structured Memory saved successfully");
      return true;
    } catch {
      toast.error("Failed to save memory");
      return false;
    } finally {
      setSavingKnowledge(false);
    }
  }, [knowledge]);

  const updateSettings = useCallback((updates: Partial<AiSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const addKnowledgeFile = useCallback((url: string) => {
    setSettings(prev => ({
      ...prev,
      knowledgeBaseFiles: [...prev.knowledgeBaseFiles, url],
    }));
  }, []);

  const removeKnowledgeFile = useCallback((index: number) => {
    setSettings(prev => ({
      ...prev,
      knowledgeBaseFiles: prev.knowledgeBaseFiles.filter((_, i) => i !== index),
    }));
  }, []);

  return {
    settings,
    knowledge,
    loading,
    saving,
    savingKnowledge,
    saveSettings,
    saveKnowledge,
    updateSettings,
    setKnowledge,
    addKnowledgeFile,
    removeKnowledgeFile,
  };
}