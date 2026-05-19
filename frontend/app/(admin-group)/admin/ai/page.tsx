"use client";

import { useAiSettings } from "@/hooks/ai/useAiSettings";
import { AiSettingsForm } from "@/components/ai/AiSettingsForm";
import { WorkflowTrainer } from "@/components/ai/WorkflowTrainer";
import { EndpointCatalog } from "@/components/ai/EndpointCatalog";

export default function AdminAIPage() {
  const {
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
  } = useAiSettings();

  return (
    <div>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              AI Assistant Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure and train your AI-powered admin assistant.
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-bold uppercase tracking-widest">
            AI Active
          </div>
        </div>

        {/* Settings Form */}
        <AiSettingsForm
          settings={settings}
          knowledge={knowledge}
          loading={loading}
          saving={saving}
          savingKnowledge={savingKnowledge}
          onSaveSettings={saveSettings}
          onSaveKnowledge={saveKnowledge}
          onUpdateSettings={updateSettings}
          onSetKnowledge={setKnowledge}
          onAddKnowledgeFile={addKnowledgeFile}
          onRemoveKnowledgeFile={removeKnowledgeFile}
        />

        {/* Workflow Trainer */}
        <WorkflowTrainer />

        {/* Endpoint Catalog */}
        <EndpointCatalog />
      </div>
    </div>
  );
}