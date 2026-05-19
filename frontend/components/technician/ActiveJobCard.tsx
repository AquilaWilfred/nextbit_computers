// components/technician/ActiveJobCard.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, MessageCircle, FileText, ChevronDown, User, Phone, MapPin, ShieldCheck } from "lucide-react";
import { ActiveJob, JobStatus } from "@/types/technician.types";
import { UrgencyBadge } from "./UrgencyBadge";
import { JobProgressBar } from "./JobProgressBar";
import { STATUS_META, JOB_STEPS } from "@/constants/technician.constants";
import { getNextJobStatus, getNextStatusLabel } from "@/lib/utils/technician.utils";

interface ActiveJobCardProps {
  job: ActiveJob;
  onStatusUpdate: (jobId: string, newStatus: JobStatus) => void;
  onMessage: (job: ActiveJob) => void;
}

export function ActiveJobCard({ job, onStatusUpdate, onMessage }: ActiveJobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(job.notes);

  const nextStatus = getNextJobStatus(job.status);
  const nextLabel = getNextStatusLabel(job.status);

  const quoteAmount = Number(job.quotedAmount ?? 0);
  const formatAmount = (value: number | null | undefined) => Number(value ?? 0).toLocaleString();

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-sm">{job.brand}</span>
              <UrgencyBadge urgency={job.urgency} />
              <span className={`text-xs font-medium ${STATUS_META[job.status].color}`}>
                · {STATUS_META[job.status].label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{job.issue}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold">KES {formatAmount(quoteAmount)}</div>
            <div className="text-xs text-muted-foreground">quoted</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{job.customerName}</span>
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{job.customerPhone}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
        </div>

        <div className="mb-4">
          <JobProgressBar status={job.status} />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Collapse" : "Quote breakdown & notes"}
        </button>

        {expanded && (
          <div className="mb-4 space-y-3">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Item</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(job.quoteLineItems || []).map((li) => (
                    <tr key={li.id} className="border-t">
                      <td className="px-3 py-2">{li.description}</td>
                      <td className="px-3 py-2 text-right font-medium">KES {formatAmount(li.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30">
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-bold">KES {formatAmount(quoteAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Job notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Internal notes about this job..."
              />
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{job.warrantyDays}-day warranty on completion</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onMessage(job)}>
            <MessageCircle className="h-3.5 w-3.5 mr-1" /> Message
          </Button>
          {nextStatus && nextLabel && (
            <Button size="sm" className="flex-1" onClick={() => onStatusUpdate(job.id, nextStatus)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> {nextLabel}
            </Button>
          )}
          {job.status === "ready" && (
            <Button size="sm" variant="outline">
              <FileText className="h-3.5 w-3.5 mr-1" /> Send warranty
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}