"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Megaphone } from "lucide-react";
import { Announcement } from "@/types/content.types";
import { formatDate } from "@/lib/utils/content.utils";

interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit: () => void;
  onDelete: () => void;
}

export const AnnouncementCard = memo(function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  return (
    <div
      className={`flex items-start justify-between p-5 border border-border bg-card hover:border-[var(--brand)]/30 transition-colors rounded-xl ${
        !announcement.active ? "opacity-60 bg-muted/20" : ""
      }`}
    >
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
          <Megaphone className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{announcement.title}</h3>
            <Badge
              variant={announcement.active ? "default" : "secondary"}
              className={`text-[10px] px-1.5 py-0 ${announcement.active ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              {announcement.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
          {announcement.image && (
            <img
              src={announcement.image}
              alt="Announcement"
              className="mt-3 h-20 w-auto rounded-lg object-cover border border-border shadow-sm"
              loading="lazy"
            />
          )}
          <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted inline-block px-2 py-0.5 rounded">
            {formatDate(announcement.date)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
});