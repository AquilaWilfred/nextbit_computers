// types/admin.ts
import { ReactNode } from "react";

export interface AdminLayoutContentProps {
  children: ReactNode;
  activeTab?: string;
}

export interface PublicSettings {
  general?: { storeName?: string };
  appearance?: { logoUrl?: string };
}

export interface Notification {
  id: string | number;
  read: boolean;
  [key: string]: unknown;
}

export interface User {
  name?: string;
  email?: string;
  [key: string]: unknown;
}