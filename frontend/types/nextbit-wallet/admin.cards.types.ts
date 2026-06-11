// types/nextbit-wallet/admin.cards.types.ts

export type CardType = "e_nextbit" | "visa_cyber" | "visa_black";
export type CardStatus = "active" | "frozen" | "expired" | "cancelled" | "pending_activation";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "under_review";
export type KycStatus = "verified" | "pending" | "failed" | "expired";
export type TransactionType = "purchase" | "deposit" | "withdrawal" | "refund" | "fee";
export type TransactionStatus = "completed" | "pending" | "failed" | "flagged";

export interface AdminStats {
  totalCards: number;
  activeCards: number;
  frozenCards: number;
  pendingApplications: number;
  approvedToday: number;
  rejectedToday: number;
  totalSpendVolume: number;
  totalLoadedBalance: number;
  fraudFlags: number;
  expiringSoon: number;
  totalHolders: number;
  newHoldersThisMonth: number;
}

export interface CardHolder {
  id: string;
  fullName: string;
  idNumber: string;
  phone: string;
  email: string;
  employment: string;
  kycStatus: KycStatus;
  createdAt: string;
  cards: number;
}

export interface CardRecord {
  id: string;
  holderName: string;
  holderEmail: string;
  cardType: CardType;
  cardNumber: string;
  lastFour: string;
  status: CardStatus;
  balance: number;
  totalSpent: number;
  issuedAt: string;
  expiresAt: string;
  fraudFlag: boolean;
  country: string;
}

export interface Application {
  id: string;
  holderName: string;
  holderEmail: string;
  phone: string;
  cardType: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  employment: string;
  idNumber: string;
  riskScore: number;
}

export interface Transaction {
  id: string;
  cardLastFour: string;
  holderName: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
  country: string;
  category: string;
}

export type AdminTab = "overview" | "cards" | "applications" | "holders" | "transactions" | "fraud";

export interface FilterState {
  search: string;
  status: string;
}