"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { KnowledgeBaseUpload } from "./KnowledgeBaseUpload";
import { MODEL_OPTIONS, CONTEXT_VARIABLES } from "@/constants/ai.constants";
import { AiSettings } from "@/types/ai.types";

interface AiSettingsFormProps {
  settings: AiSettings;
  knowledge: string;
  loading: boolean;
  saving: boolean;
  savingKnowledge: boolean;
  onSaveSettings: () => void;
  onSaveKnowledge: () => void;
  onUpdateSettings: (updates: Partial<AiSettings>) => void;
  onSetKnowledge: (value: string) => void;
  onAddKnowledgeFile: (url: string) => void;
  onRemoveKnowledgeFile: (index: number) => void;
}

export const AiSettingsForm = memo(function AiSettingsForm({
  settings,
  knowledge,
  loading,
  saving,
  savingKnowledge,
  onSaveSettings,
  onSaveKnowledge,
  onUpdateSettings,
  onSetKnowledge,
  onAddKnowledgeFile,
  onRemoveKnowledgeFile,
}: AiSettingsFormProps) {
  if (loading) {
    return (
      <Card className="p-6 md:p-8">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--brand)]" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-8">
        {/* Model Selection */}
        <div className="space-y-3">
          <Label htmlFor="ai-model">AI Model</Label>
          <Select
            value={settings.model}
            onValueChange={val => onUpdateSettings({ model: val })}
          >
            <SelectTrigger id="ai-model" className="w-full md:w-1/2">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Prompt */}
        <div className="space-y-3">
          <Label htmlFor="system-prompt">System Prompt</Label>
          <Textarea
            id="system-prompt"
            value={settings.systemPrompt}
            onChange={e => onUpdateSettings({ systemPrompt: e.target.value })}
            rows={8}
            placeholder="Define the AI's personality, role, and instructions…"
          />
          <p className="text-xs text-muted-foreground">
            Core instruction set for the AI — applies across all panels (Customer, Admin, Driver).
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[10px] font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
              Context Variables Automatically Injected:
            </span>
            {CONTEXT_VARIABLES.map(v => (
              <span key={v} className="text-[10px] font-mono bg-[var(--brand)]/10 text-[var(--brand)] px-2 py-1 rounded border border-[var(--brand)]/20">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>

        {/* Knowledge Base */}
        <KnowledgeBaseUpload
          files={settings.knowledgeBaseFiles}
          onAddFile={onAddKnowledgeFile}
          onRemoveFile={onRemoveKnowledgeFile}
        />

        {/* Structured Memory */}
        <div className="mt-6 pt-6 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-lg font-semibold">Structured Memory</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Analysed data extracted from trained documents. The AI reads this to answer questions.
              </p>
            </div>
            <Button onClick={onSaveKnowledge} size="sm" className="gap-2" disabled={savingKnowledge}>
              {savingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </Button>
          </div>
          <Textarea
            value={knowledge}
            onChange={e => onSetKnowledge(e.target.value)}
            rows={8}
            placeholder="Train documents above to populate this, or type manual facts here…"
          />
        </div>

        <Button onClick={onSaveSettings} className="gap-2" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save AI Settings
        </Button>
      </div>
    </Card>
  );
});