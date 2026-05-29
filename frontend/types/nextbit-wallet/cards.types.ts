export type CardType = "e_nextbit" | "visa_cyber" | "visa_black";
export type CardStatus = "pending" | "approved" | "rejected" | "active";
export type VirtualCardStatus = "active" | "frozen" | "expired";
export type EmploymentStatus = "employed" | "self-employed" | "student" | "unemployed" | "retired";

export interface CardProduct {
  id: string;
  name: string;
  type: CardType;
  features: string[];
  benefits: string[];
  fees: {
    annual: number;
    foreignTxn: number;
    atm: number;
  };
  requirements: string[];
  popular?: boolean;
  colorScheme: {
    bg: string;
    gradient: string;
    cardBg: string;
    accent: string;
  };
}

export interface CardApplication {
  id: string;
  cardType: string;
  status: CardStatus;
  appliedAt: string;
  approvedAt?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

export interface VirtualCard {
  id: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  balance: number;
  currency: string;
  status: VirtualCardStatus;
  lastFour: string;
  cardType: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  status: string;
  description?: string;
}

export interface UserStats {
  rewardsEarned: number;
  securityLevel: string;
  totalSpent: number;
  cardsIssued: number;
}

export interface ApplicationFormData {
  product_type: CardType;
  full_name: string;
  id_number: string;
  phone: string;
  email: string;
  employment: EmploymentStatus;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}