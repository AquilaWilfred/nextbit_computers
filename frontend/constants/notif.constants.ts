import { Package, Truck, AlertCircle, DollarSign, ShoppingCart, Mail } from "lucide-react";
import { IconMap } from "@/types/notif.types";

export const ICON_MAP: IconMap = {
  Package, Truck, AlertCircle, DollarSign, ShoppingCart, Mail,
};

export const POLL_INTERVAL = 60000; // 1 minute

export const STORAGE_KEYS = {
  READ: "admin_read_notifications",
  DISMISSED: "admin_dismissed_notifications",
} as const;

export const STORAGE_EVENT = "admin_notifications_updated";