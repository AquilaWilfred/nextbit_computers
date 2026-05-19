"use client";

import { memo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2 } from "lucide-react";
import { NotificationWithState } from "@/types/notif.types";
import { NotificationIcon } from "./NotificationIcon";

interface NotificationCardProps {
  notification: NotificationWithState;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const NotificationCard = memo(function NotificationCard({
  notification,
  onMarkAsRead,
  onDismiss,
}: NotificationCardProps) {
  const { id, title, message, icon, bgColor, color, actionLink, actionText, time, isRead } = notification;

  return (
    <Card
      className={`p-5 mb-4 transition-all duration-300 ${
        isRead
          ? "opacity-70 bg-muted/20"
          : "border-l-4 border-l-[var(--brand)] shadow-md bg-card"
      }`}
      role="article"
      aria-label={title}
    >
      <div className="flex items-start gap-4">
        <NotificationIcon iconName={icon} bgColor={bgColor} color={color} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {title}
              {!isRead && (
                <Badge className="bg-[var(--brand)] text-white text-[10px] px-1.5 py-0">
                  New
                </Badge>
              )}
            </h2>
            <time className="text-xs font-medium text-muted-foreground">
              {time || "Recent"}
            </time>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            {message}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={actionLink} onClick={() => onMarkAsRead(id)}>
              <Button
                size="sm"
                className="gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                {actionText}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </Button>
            </Link>

            {!isRead && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkAsRead(id)}
                className="text-muted-foreground hover:text-foreground"
              >
                Mark as Read
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(id)}
              className="text-muted-foreground hover:text-destructive ml-auto"
              aria-label={`Dismiss notification: ${title}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});