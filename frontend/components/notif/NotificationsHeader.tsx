"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle } from "lucide-react";

interface NotificationsHeaderProps {
  unreadCount: number;
  onMarkAllAsRead: () => void;
}

export const NotificationsHeader = memo(function NotificationsHeader({
  unreadCount,
  onMarkAllAsRead,
}: NotificationsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="w-8 h-8 text-[var(--brand)]" aria-hidden />
          Action Center &amp; Notifications
        </h1>
        <p className="text-muted-foreground mt-1">
          Stay on top of system errors, driver requests, and customer issues.
        </p>
      </div>
      {unreadCount > 0 && (
        <Button
          variant="outline"
          onClick={onMarkAllAsRead}
          className="gap-2 shrink-0"
          aria-label={`Mark all ${unreadCount} notifications as read`}
        >
          <CheckCircle className="w-4 h-4 text-green-500" aria-hidden />
          Mark all as read
          <Badge className="bg-[var(--brand)] text-white ml-1">{unreadCount}</Badge>
        </Button>
      )}
    </div>
  );
});