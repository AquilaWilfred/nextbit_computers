"use client";

import { memo } from "react";
import { AlertCircle } from "lucide-react";
import { ICON_MAP } from "@/constants/notif.constants";

interface NotificationIconProps {
  iconName: string;
  bgColor: string;
  color: string;
}

export const NotificationIcon = memo(function NotificationIcon({
  iconName,
  bgColor,
  color,
}: NotificationIconProps) {
  const Icon = ICON_MAP[iconName] ?? AlertCircle;

  return (
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${bgColor} ${color}`}
      aria-hidden
    >
      <Icon className="w-6 h-6" />
    </div>
  );
});