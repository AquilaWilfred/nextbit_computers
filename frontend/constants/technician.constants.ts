// constants/technician.constants.ts
import { Urgency, JobStatus, PayoutStatus } from "@/types/technician.types";

export const URGENCY_META: Record<Urgency, { label: string; className: string; dot: string }> = {
  low: { label: "Flexible", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  medium: { label: "Standard", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  high: { label: "Urgent", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export const STATUS_META: Record<JobStatus, { label: string; color: string; step: number }> = {
  new_request:    { label: "New request",    color: "text-gray-500",    step: 0 },
  quote_sent:     { label: "Quote sent",     color: "text-blue-600",    step: 1 },
  quote_accepted: { label: "Confirmed",      color: "text-emerald-600", step: 2 },
  diagnosed:      { label: "Diagnosed",      color: "text-emerald-600", step: 3 },
  parts_ordered:  { label: "Parts ordered",  color: "text-amber-600",   step: 4 },
  in_repair:      { label: "In repair",      color: "text-blue-600",    step: 5 },
  ready:          { label: "Ready",          color: "text-emerald-600", step: 6 },
  completed:      { label: "Completed",      color: "text-gray-500",    step: 7 },
  declined:       { label: "Declined",       color: "text-red-500",     step: 0 },
  cancelled:      { label: "Cancelled",      color: "text-gray-400",    step: 0 },
};

export const JOB_STEPS: JobStatus[] = [
  "quote_accepted", "diagnosed", "parts_ordered", "in_repair", "ready", "completed",
];

export const ALL_SPECIALTIES = [
  "Laptop", "Desktop", "Screen", "Motherboard", "Keyboard",
  "Battery", "RAM", "Storage", "Printer", "Phone", "Tablet",
];

export const PAYOUT_STATUS_META: Record<PayoutStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700" },
  processing: { label: "Processing", className: "bg-blue-50 text-blue-700" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700" },
};