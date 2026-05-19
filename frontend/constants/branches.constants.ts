import { HourRow, BranchFormData } from "@/types/branches.types";

export const DEFAULT_HOURS: HourRow[] = [
  { label: "Mon - Fri", value: "9:00 AM - 6:00 PM" },
  { label: "Saturday", value: "10:00 AM - 4:00 PM" },
  { label: "Sunday", value: "Closed" },
];

export const DEFAULT_FORM: BranchFormData = {
  name: "",
  address: "",
  phone: "",
  email: "",
  lat: "",
  lng: "",
  isMain: false,
  active: true,
  hours: DEFAULT_HOURS,
};

export const HOURS_LABELS = {
  monday_friday: "Mon - Fri",
  saturday: "Saturday",
  sunday: "Sunday",
} as const;