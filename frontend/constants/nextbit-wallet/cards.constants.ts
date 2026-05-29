import { EmploymentStatus } from "@/types/nextbit-wallet/cards.types";

export const API_BASE = "/api/cards";

export const STATIC_STATS = [
  { 
    icon: "Wallet", 
    label: "Virtual Cards Issued", 
    key: "cardsIssued" as const,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600"
  },
  { 
    icon: "Activity", 
    label: "Total Spent", 
    key: "totalSpent" as const,
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
    isCurrency: true
  },
  { 
    icon: "Award", 
    label: "Rewards Earned", 
    key: "rewardsEarned" as const,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
    suffix: " pts"
  },
  { 
    icon: "Shield", 
    label: "Security Level", 
    key: "securityLevel" as const,
    bgColor: "bg-green-100",
    iconColor: "text-green-600"
  },
];

export const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-employed" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
];

export const CARD_STATUS_CONFIG = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  approved: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
  active: { bg: "bg-green-100", text: "text-green-800", label: "Active" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
} as const;

export const CACHE_KEYS = {
  PRODUCTS: "cards_products",
  APPLICATIONS: "cards_applications",
  VIRTUAL_CARD: "cards_virtual",
  TRANSACTIONS: "cards_transactions",
  STATS: "cards_stats",
} as const;

export const QUERY_STALE_TIME = 30000; // 30 seconds