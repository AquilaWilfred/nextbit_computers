// components/technician/JobsTab.tsx
"use client";

import { Wrench, RefreshCw } from "lucide-react";
import { ActiveJob, JobStatus } from "@/types/technician.types";
import { ActiveJobCard } from "./ActiveJobCard";

interface JobsTabProps {
  jobs: ActiveJob[];
  completed?: import("@/types/technician.types").CompletedJob[];
  onStatusUpdate: (jobId: string, newStatus: JobStatus) => void;
  onMessage: (job: ActiveJob) => void;
  isAutoRefreshing?: boolean;  // Add this
}

export function JobsTab({ jobs, completed = [], onStatusUpdate, onMessage, isAutoRefreshing = false }: JobsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{jobs.length} active job{jobs.length !== 1 ? "s" : ""}</h2>
          {isAutoRefreshing && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No active jobs. Accept a request to get started.</p>
        </div>
      ) : (
        jobs.map((job) => (
          <ActiveJobCard
            key={job.id}
            job={job}
            onStatusUpdate={onStatusUpdate}
            onMessage={onMessage}
          />
        ))
      )}

      {/* Completed jobs */}
      <div className="mt-6 border-t border-border pt-4">
        <h3 className="font-semibold text-sm mb-3">Completed Jobs</h3>
        {completed.length === 0 ? (
          <div className="text-xs text-muted-foreground">No completed jobs yet.</div>
        ) : (
          <div className="space-y-3">
            {completed.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-card p-3 rounded-md">
                <div>
                  <div className="font-medium">{c.customerName} — {c.device}</div>
                  <div className="text-xs text-muted-foreground">{c.issue}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{typeof c.amount === 'number' ? `KES ${c.amount.toLocaleString()}` : c.amount}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.completedAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}