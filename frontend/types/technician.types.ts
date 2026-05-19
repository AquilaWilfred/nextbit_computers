// types/technician.types.ts
export type JobStatus =
  | "new_request"
  | "quote_sent"
  | "quote_accepted"
  | "diagnosed"
  | "parts_ordered"
  | "in_repair"
  | "ready"
  | "completed"
  | "declined"
  | "cancelled";

export type Urgency = "low" | "medium" | "high";
export type ServiceMode = "drop_off" | "home_visit" | "either";
export type PartsPreference = "oem_only" | "oem_or_aftermarket" | "cheapest" | "tech_choice";
export type PayoutStatus = "pending" | "processing" | "paid";
export type ActiveTab = "dashboard" | "requests" | "jobs" | "earnings" | "profile" | "parts";

export interface QuoteLineItem {
  id: string;
  description: string;
  amount: number;
}

export interface IncomingRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  device: string;
  brand: string;
  issue: string;
  urgency: Urgency;
  budget: number;
  location: string;
  distanceKm: number;
  serviceMode: ServiceMode;
  partsPreference: PartsPreference;
  photoUrls: string[];
  postedAt: string;
  expiresAt: string;
}

export interface ActiveJob {
  id: string;
  requestId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  device: string;
  brand: string;
  issue: string;
  status: JobStatus;
  urgency: Urgency;
  serviceMode: ServiceMode;
  location: string;
  quotedAmount: number;
  quoteLineItems: QuoteLineItem[];
  partsOrdered: boolean;
  partsCost: number;
  startedAt: string | null;
  completedAt: string | null;
  warrantyDays: number;
  notes: string;
  progressPercent: number;
}

export interface CompletedJob {
  id: string;
  customerName: string;
  device: string;
  issue: string;
  amount: number;
  payoutStatus: PayoutStatus;
  completedAt: string;
  customerRating: number | null;
  customerReview: string | null;
  warrantyExpiry: string;
}

export interface Earnings {
  this_month: number;
  last_month: number;
  all_time: number;
  pending: number;
  jobs_this_month: number;
  avg_job_value: number;
  completion_rate: number;
}

export interface TechnicianProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  bio: string;
  specialties: string[];
  minPrice: number;
  warrantyDays: number;
  serviceRadius: number;
  available: boolean;
  iprsVerified: boolean;
  insured: boolean;
  rating: number;
  reviewCount: number;
  joinedAt: string;
}

export interface Message {
  id: string;
  jobId: string;
  from: "technician" | "customer";
  text: string;
  sentAt: string;
}