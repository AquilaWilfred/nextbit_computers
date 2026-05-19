// types/auth.types.ts
export interface ResetData {
  token: string;
  email: string;
}

export interface VerificationData {
  token: string;
  email: string;
}

export interface TechnicianApplication {
  location: string;
  bio: string;
  specialties: string[];
  minPrice: number;
  warrantyDays: number;
  serviceRadius: number;
}

export interface FormState {
  firstName: string;
  lastName: string;
  surname: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  rememberMe: boolean;
}