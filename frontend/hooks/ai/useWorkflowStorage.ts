import { useState, useEffect, useCallback } from 'react';
import { SavedWorkflow } from '@/types/ai.types';

const STORAGE_KEY = "admin_ai_saved_workflows";

export function useWorkflowStorage() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWorkflows(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveWorkflow = useCallback((workflow: SavedWorkflow) => {
    const newWorkflows = [...workflows, workflow];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWorkflows));
    } catch {
      // ignore
    }
    setWorkflows(newWorkflows);
  }, [workflows]);

  const deleteWorkflow = useCallback((index: number) => {
    const newWorkflows = workflows.filter((_, i) => i !== index);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWorkflows));
    } catch {
      // ignore
    }
    setWorkflows(newWorkflows);
  }, [workflows]);

  return {
    workflows,
    saveWorkflow,
    deleteWorkflow,
  };
}