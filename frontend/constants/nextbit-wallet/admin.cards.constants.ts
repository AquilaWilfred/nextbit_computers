// constants/nextbit-wallet/admin.cards.constants.ts

import { AdminTab, CardType, TransactionType } from "@/types/nextbit-wallet/admin.cards.types";

export const API_BASE = "/api/admin/cards";

export const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "Activity" },
  { id: "cards", label: "Cards", icon: "Card" },
  { id: "applications", label: "Applications", icon: "Clock" },
  { id: "holders", label: "Holders", icon: "Users" },
  { id: "transactions", label: "Transactions", icon: "Dollar" },
  { id: "fraud", label: "Fraud & Flags", icon: "Flag" },
];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  e_nextbit: "E-NextBit",
  visa_cyber: "Visa Cyber",
  visa_black: "Visa Black",
};

export const CARD_TYPE_COLORS: Record<CardType, string> = {
  e_nextbit: "from-emerald-500 to-green-600",
  visa_cyber: "from-cyan-500 to-blue-600",
  visa_black: "from-purple-600 to-gray-900",
};

export const STATUS_BADGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-800", label: "Active" },
  approved: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
  verified: { bg: "bg-green-100", text: "text-green-800", label: "Verified" },
  completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
  frozen: { bg: "bg-blue-100", text: "text-blue-800", label: "Frozen" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  pending_activation: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Activation" },
  under_review: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Under Review" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
  failed: { bg: "bg-red-100", text: "text-red-800", label: "Failed" },
  flagged: { bg: "bg-red-100", text: "text-red-800", label: "Flagged" },
  expired: { bg: "bg-gray-100", text: "text-gray-600", label: "Expired" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-600", label: "Cancelled" },
  purchase: { bg: "bg-purple-100", text: "text-purple-800", label: "Purchase" },
  deposit: { bg: "bg-green-100", text: "text-green-800", label: "Deposit" },
  withdrawal: { bg: "bg-orange-100", text: "text-orange-800", label: "Withdrawal" },
  refund: { bg: "bg-cyan-100", text: "text-cyan-800", label: "Refund" },
  fee: { bg: "bg-gray-100", text: "text-gray-600", label: "Fee" },
  e_nextbit: { bg: "bg-emerald-100", text: "text-emerald-800", label: "E-NextBit" },
  visa_cyber: { bg: "bg-cyan-100", text: "text-cyan-800", label: "Visa Cyber" },
  visa_black: { bg: "bg-purple-100", text: "text-purple-800", label: "Visa Black" },
};

export const CARD_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "frozen", label: "Frozen" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "pending_activation", label: "Pending activation" },
];

export const APPLICATION_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const TRANSACTION_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "flagged", label: "Flagged" },
];

export const QUERY_STALE_TIME = 30000; // 30 seconds

export const STAT_CARDS_CONFIG = [
  { key: "totalCards", label: "Total Cards", icon: "Card", color: "blue" as const },
  { key: "activeCards", label: "Active", icon: "Check", color: "green" as const, suffix: "%" },
  { key: "frozenCards", label: "Frozen", icon: "Lock", color: "cyan" as const },
  { key: "pendingApplications", label: "Pending Apps", icon: "Clock", color: "yellow" as const },
  { key: "fraudFlags", label: "Fraud Flags", icon: "Flag", color: "red" as const },
  { key: "expiringSoon", label: "Expiring Soon", icon: "Warning", color: "orange" as const },
  { key: "totalHolders", label: "Total Holders", icon: "Users", color: "purple" as const },
  { key: "newHoldersThisMonth", label: "New (Month)", icon: "Zap", color: "blue" as const },
  { key: "approvedToday", label: "Approved (All)", icon: "Check", color: "green" as const },
  { key: "rejectedToday", label: "Rejected (All)", icon: "X", color: "red" as const },
  { key: "totalLoadedBalance", label: "Loaded Balance", icon: "Dollar", color: "blue" as const, isCurrency: true, isMillions: true },
  { key: "totalSpendVolume", label: "Total Volume", icon: "Activity", color: "green" as const, isCurrency: true, isMillions: true },
];