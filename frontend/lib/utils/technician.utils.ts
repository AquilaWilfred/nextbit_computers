// utils/technician.utils.ts
import { JobStatus } from "@/types/technician.types";
import { JOB_STEPS, STATUS_META } from "@/constants/technician.constants";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

export function getJobProgressPercent(status: JobStatus): number {
  const current = STATUS_META[status].step;
  const total = JOB_STEPS.length;
  return Math.round((Math.max(current - 2, 0) / (total - 1)) * 100);
}

export function getNextJobStatus(status: JobStatus): JobStatus | null {
  const nextStatus: Partial<Record<JobStatus, JobStatus>> = {
    quote_accepted: "diagnosed",
    diagnosed: "parts_ordered",
    parts_ordered: "in_repair",
    in_repair: "ready",
    ready: "completed",
  };
  return nextStatus[status] || null;
}

export function getNextStatusLabel(status: JobStatus): string | null {
  const labels: Partial<Record<JobStatus, string>> = {
    quote_accepted: "Mark as Diagnosed",
    diagnosed: "Order Parts",
    parts_ordered: "Mark In Repair",
    in_repair: "Mark Ready",
    ready: "Mark Complete",
  };
  return labels[status] || null;
}