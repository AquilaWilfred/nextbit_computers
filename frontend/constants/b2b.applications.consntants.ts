import { AppStatus } from "@/types/b2b.applications.types";
import {
  Clock, Eye, CheckCircle2, XCircle, MessageSquare,
} from "lucide-react";

export const APP_STATUS: Record<AppStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock,
  },
  under_review: {
    label: "Under Review",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: XCircle,
  },
  more_info_needed: {
    label: "More Info Needed",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: MessageSquare,
  },
};

export const PAYMENT_TERMS: Record<string, { label: string; days: number }> = {
  net_14: { label: "Net 14 days", days: 14 },
  net_30: { label: "Net 30 days", days: 30 },
  net_60: { label: "Net 60 days", days: 60 },
  net_90: { label: "Net 90 days", days: 90 },
};

export const REQUIRED_DOCUMENTS = ["cert_of_incorporation", "kra_pin_cert", "cr12"];

export const STATUS_OPTIONS: (AppStatus | "all")[] = [
  "all", "pending", "under_review", "more_info_needed", "approved", "rejected",
];