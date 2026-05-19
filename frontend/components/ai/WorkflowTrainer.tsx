"use client";

import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Play, Square, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAIWorkflow } from "@/contexts/AIWorkflowContext";
import { useWorkflowStorage } from "@/hooks/ai/useWorkflowStorage";
import { SavedWorkflow } from "@/types/ai.types";

interface WorkflowTrainerProps {
  onWorkflowSaved?: () => void;
}

export const WorkflowTrainer = memo(function WorkflowTrainer({ onWorkflowSaved }: WorkflowTrainerProps) {
  const { isRecording, recordedActions, startRecording, stopRecording, clearActions } = useAIWorkflow();
  const { workflows, saveWorkflow, deleteWorkflow } = useWorkflowStorage();
  const [workflowName, setWorkflowName] = useState("");

  const handleStartRecording = () => {
    startRecording();
    toast.info("Recording started. Perform the actions you want the AI to learn.");
  };

  const handleStopRecording = () => {
    stopRecording();
    toast.info("Recording stopped.");
  };

  const handleSaveWorkflow = () => {
    if (!workflowName.trim()) {
      toast.error("Please enter a workflow name.");
      return;
    }
    if (!recordedActions.length) {
      toast.error("No recorded actions to save.");
      return;
    }
    
    saveWorkflow({
      name: workflowName.trim(),
      actions: recordedActions,
      savedAt: new Date().toISOString(),
    });
    
    setWorkflowName("");
    clearActions();
    toast.success("Workflow saved locally.");
    onWorkflowSaved?.();
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-[var(--brand)]" /> Workflow Training
          </h2>
          <p className="text-muted-foreground mt-1">
            Record your actions to teach the AI how to perform common tasks.
          </p>
        </div>

        {/* Recording UI */}
        {isRecording ? (
          <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 space-y-4">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
              Recording Actions…
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                placeholder="e.g. 'How to add a new product'"
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
              />
            </div>
            
            <div className="max-h-40 overflow-y-auto bg-background/50 p-3 rounded-md border border-border text-xs space-y-1.5 font-mono text-muted-foreground">
              {recordedActions.length > 0 ? (
                recordedActions.map((action, i) => (
                  <p key={i}>{i + 1}. {action.description}</p>
                ))
              ) : (
                <p>Waiting for actions…</p>
              )}
            </div>
            
            <Button onClick={handleStopRecording} variant="destructive" className="w-full gap-2">
              <Square size={18} /> Stop Recording
            </Button>
          </div>
        ) : recordedActions.length > 0 ? (
          <div className="p-4 rounded-lg border border-border bg-background/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Captured Actions</span>
              <Button size="sm" variant="outline" onClick={clearActions}>Clear</Button>
            </div>
            
            <div className="max-h-40 overflow-y-auto bg-background/50 p-3 rounded-md border text-xs space-y-1.5 font-mono text-muted-foreground">
              {recordedActions.map((action, i) => (
                <p key={i}>{i + 1}. {action.description}</p>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Save this capture locally for analysis or model training.
            </p>
            
            <div className="space-y-2">
              <Input
                placeholder="Workflow name…"
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Button onClick={handleSaveWorkflow} className="w-full gap-2" disabled={!workflowName.trim()}>
                  <Save size={18} /> Save Workflow Locally
                </Button>
                <Button onClick={handleStartRecording} variant="outline" className="w-full gap-2">
                  <Play size={18} /> Record Again
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button onClick={handleStartRecording} className="w-full gap-2">
            <Play size={18} /> Start New Workflow Recording
          </Button>
        )}

        {/* Saved Workflows List */}
        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold mb-3">Saved Workflows ({workflows.length})</h3>
          
          {workflows.length > 0 ? (
            <div className="space-y-3">
              {workflows.map((workflow, idx) => (
                <SavedWorkflowItem
                  key={idx}
                  workflow={workflow}
                  onDelete={() => deleteWorkflow(idx)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No locally saved workflows yet. Record one to get started.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});

// Sub-component for saved workflow item
function SavedWorkflowItem({ workflow, onDelete }: { workflow: SavedWorkflow; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-border p-4 bg-background/80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">{workflow.name}</div>
          <div className="text-xs text-muted-foreground">
            Saved {new Date(workflow.savedAt).toLocaleString()}
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      </div>
      <div className="mt-3 text-xs text-muted-foreground space-y-1 font-mono max-h-32 overflow-y-auto">
        {workflow.actions.map((action, ai) => (
          <p key={ai}>{ai + 1}. {action.description}</p>
        ))}
      </div>
    </div>
  );
}