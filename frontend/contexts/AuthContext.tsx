"use client";
import { createContext } from 'react';

export interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  isInitialized: boolean;
  logout: () => void;
  refetchUser: () => Promise<void>;
  waitForAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);