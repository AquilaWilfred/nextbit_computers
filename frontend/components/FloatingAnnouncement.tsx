// components/FloatingAnnouncement.tsx
"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, Megaphone } from "lucide-react";
import { Announcement } from "@/types/home.types";

interface FloatingAnnouncementProps {
  announcements?: Announcement[];
}

export function FloatingAnnouncement({ announcements }: FloatingAnnouncementProps) {
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    if (typeof localStorage !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("dismissed_announcements") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const dismissAnnouncement = (id: number) => {
    setDismissedIds((prev) => {
      const next = [...prev, id];
      localStorage.setItem("dismissed_announcements", JSON.stringify(next));
      return next;
    });
  };

  const activeAnnouncements = announcements?.filter((a) => a.active) ?? [];
  const latestAnnouncement = activeAnnouncements[0];

  if (!latestAnnouncement || dismissedIds.includes(latestAnnouncement.id)) {
    return null;
  }

  const content = (
    <div className="relative z-10">
      {latestAnnouncement.image && (
        <div className="relative h-36 w-full overflow-hidden">
          <img
            src={latestAnnouncement.image}
            alt={latestAnnouncement.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            width={320}
            height={144}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <h4 className="absolute bottom-3 left-4 right-8 font-display font-bold text-white text-lg leading-tight drop-shadow-md">
            {latestAnnouncement.title}
          </h4>
        </div>
      )}
      <div className="p-5">
        {!latestAnnouncement.image && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4 text-[var(--brand)]" />
            </div>
            <h4 className="font-display font-bold text-sm leading-tight">{latestAnnouncement.title}</h4>
          </div>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">{latestAnnouncement.content}</p>
        {latestAnnouncement.linkUrl && (
          <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-[var(--brand)] group-hover:translate-x-1 transition-transform">
            Learn more <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <aside
      className="fixed bottom-6 right-6 z-50 w-[calc(100%-3rem)] sm:w-80 bg-gradient-to-br from-card to-[var(--brand)]/10 backdrop-blur-xl border border-[var(--brand)]/20 hover:border-[var(--brand)]/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500 group transition-colors"
      role="status"
      aria-live="polite"
      aria-label={`Announcement: ${latestAnnouncement.title}`}
    >
      <button
        type="button"
        onClick={() => dismissAnnouncement(latestAnnouncement.id)}
        className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors z-20"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>

      {latestAnnouncement.linkUrl ? (
        <a href={latestAnnouncement.linkUrl} className="block cursor-pointer">
          {content}
        </a>
      ) : (
        content
      )}
    </aside>
  );
}