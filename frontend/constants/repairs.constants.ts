// constants/repairs.constants.ts
import { Urgency, PartCondition, RequestStatus } from "@/types/repairs.types";
import { RequestFormState } from "@/types/repairs.types";

export const SPECIALTIES = ["Laptop", "Desktop", "Screen", "Motherboard", "Phone", "Battery", "Keyboard", "RAM", "Storage"];
export const PART_CATEGORIES = ["Screens", "Batteries", "Keyboards", "RAM", "Storage"];

export const URGENCY_META: Record<Urgency, { emoji: string; label: string; sub: string; active: string }> = {
  low: { emoji: "🟢", label: "Flexible", sub: "1–2 weeks", active: "bg-emerald-700 border-emerald-700 text-white" },
  medium: { emoji: "🟡", label: "Standard", sub: "3–5 days", active: "bg-amber-500 border-amber-500 text-slate-900" },
  high: { emoji: "🔴", label: "Urgent", sub: "Same day", active: "bg-red-700 border-red-700 text-white" },
};

export const STATUS_MAP: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  quoted: { label: "Quotes received", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In progress", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export const CONDITION_MAP: Record<PartCondition, { label: string; className: string }> = {
  oem: { label: "OEM", className: "bg-blue-50 text-blue-700" },
  new: { label: "New", className: "bg-emerald-50 text-emerald-700" },
  aftermarket: { label: "Aftermarket", className: "bg-amber-50 text-amber-700" },
  used: { label: "Tested Used", className: "bg-gray-100 text-gray-600" },
};

export const PART_CATEGORY_ICONS: Record<string, string> = {
  Screens: "Monitor",
  Batteries: "Battery",
  Keyboards: "Keyboard",
  RAM: "Cpu",
  Storage: "HardDrive",
};

export const FORM_DEFAULTS: RequestFormState = {
  deviceType: "",
  brand: "",
  issue: "",
  urgency: "medium",
  budget: "",
  location: "",
  serviceMode: "drop_off",
  partsPreference: "oem_or_aftermarket",
};