// types/repairs.types.ts
export type Urgency = "low" | "medium" | "high";
export type RequestStatus = "pending" | "quoted" | "in_progress" | "completed";
export type PartCondition = "oem" | "new" | "aftermarket" | "used";
export type ServiceMode = "drop_off" | "home_visit" | "either";
export type PartsPreference = "oem_only" | "oem_or_aftermarket" | "cheapest" | "tech_choice";
export type SortKey = "rating" | "distance" | "price" | "jobs";
export type ActiveTab = "find" | "parts" | "requests" | "history";
export type PartTab = "genuine" | "aftermarket" | "used";

export interface Technician {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
  verified: boolean;
  iprsVerified: boolean;
  available: boolean;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  distanceKm: number;
  location: string;
  specialties: string[];
  minPrice: number;
  maxPrice: number;
  warrantyDays: number;
  insured: boolean;
  responseTime: string;
  bio: string;
}

export interface Review {
  id: string;
  technicianId: string;
  reviewerName: string;
  rating: number;
  device: string;
  comment: string;
  date: string;
}

export interface SparePart {
  id: string;
  name: string;
  compatibility: string;
  price: number;
  condition: PartCondition;
  category: string;
  supplier: string;
  stock: number;
  warrantyDays: number;
}

export interface RepairRequest {
  id: string;
  device: string;
  brand: string;
  issue: string;
  status: RequestStatus;
  urgency: Urgency;
  budget: number;
  location: string;
  serviceMode: ServiceMode;
  partsPreference: PartsPreference;
  quotesReceived: number;
  lowestQuote: number | null;
  assignedTech: string | null;
  progressPercent: number;
  createdAt: string;
}

export interface CompletedRepair {
  id: string;
  device: string;
  issue: string;
  technician: string;
  cost: number;
  completedDate: string;
  userRating: number;
  warrantyExpiry: string;
  warrantyActive: boolean;
  paymentVerified?: boolean;
}

export interface RequestFormState {
  deviceType: string;
  brand: string;
  issue: string;
  urgency: Urgency;
  budget: string;
  location: string;
  serviceMode: ServiceMode;
  partsPreference: PartsPreference;
}