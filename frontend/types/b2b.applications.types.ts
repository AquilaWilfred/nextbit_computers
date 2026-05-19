export type AppStatus = "pending" | "under_review" | "approved" | "rejected" | "more_info_needed";

export interface B2BApplication {
  id: string;
  referenceNumber: string;
  status: AppStatus;
  submittedAt: string;
  updatedAt: string;
  company: {
    name: string;
    kraPin: string;
    registrationNumber: string;
    vatNumber?: string;
    industry: string;
    physicalAddress: string;
    city: string;
    country: string;
    website?: string;
  };
  primaryContact: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    department: string;
  };
  financeContact: {
    fullName: string;
    email: string;
    phone: string;
  };
  documents: {
    key: string;
    label: string;
    url: string;
    uploadedAt: string;
    verified?: boolean;
    verifiedBy?: string;
  }[];
  reviewNotes?: string;
  creditLimit?: number;
  paymentTerms?: "net_14" | "net_30" | "net_60" | "net_90";
  reviewedBy?: string;
}

export interface StatusChangeOptions {
  notes?: string;
  creditLimit?: number;
  paymentTerms?: string;
}