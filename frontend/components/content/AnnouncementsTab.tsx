"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAnnouncements } from "@/hooks/content/useAnnouncements";
import { AnnouncementCard } from "./AnnouncementCard";
import { ContentEmptyState } from "./ContentEmptyState";
import { Announcement } from "@/types/content.types";

interface AnnouncementsTabProps {
  onAdd: () => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: number) => Promise<void>;
}

export const AnnouncementsTab = memo(function AnnouncementsTab({ onAdd, onEdit, onDelete }: AnnouncementsTabProps) {
  const { announcements, isLoading } = useAnnouncements();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={onAdd}>
          <Plus size={18} /> Add Announcement
        </Button>
      </div>

      {!announcements?.length ? (
        <ContentEmptyState type="announcement" onAdd={onAdd} />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onEdit={() => onEdit(announcement)}
              onDelete={() => onDelete(announcement.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});