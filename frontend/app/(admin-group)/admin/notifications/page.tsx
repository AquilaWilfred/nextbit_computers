"use client";

import Head from "next/head";
import { useMemo } from "react";
import { useNotifications } from "@/hooks/notif/useNotifications";
import { useNotificationStorage } from "@/hooks/notif/useNotificationStorage";
import { useNotificationActions } from "@/hooks/notif/useNotificationActions";
import { NotificationsHeader } from "@/components/notif/NotificationsHeader";
import { NotificationCard } from "@/components/notif/NotificationCard";
import { EmptyState } from "@/components/notif/EmptyState";
import { LoadingSpinner } from "@/components/notif/NotificationsSkeleton";

export default function AdminNotificationsPage() {
  const { notifications, isLoading } = useNotifications();
  const { readIds, dismissedIds, setReadIds, setDismissedIds } = useNotificationStorage();

  // Filter active notifications (not dismissed) - MEMOIZED to prevent infinite loops
  const activeNotifications = useMemo(() => {
    return notifications
      .filter((n) => !dismissedIds.includes(n.id))
      .map((n) => ({ ...n, isRead: readIds.includes(n.id) }));
  }, [notifications, dismissedIds, readIds]);

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !n.isRead).length;
  }, [activeNotifications]);

  const { markAsRead, markAllAsRead, dismiss } = useNotificationActions({
    readIds,
    setReadIds,
    setDismissedIds,
    activeNotifications,
  });

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Notifications | Admin Dashboard</title>
          <meta name="description" content="Admin action center — manage orders, alerts, and system notifications." />
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="space-y-6 max-w-5xl">
          <NotificationsHeader unreadCount={0} onMarkAllAsRead={markAllAsRead} />
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Notifications | Admin Dashboard</title>
        <meta name="description" content="Admin action center — manage orders, alerts, and system notifications." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="space-y-6 max-w-5xl">
        <NotificationsHeader unreadCount={unreadCount} onMarkAllAsRead={markAllAsRead} />

        <section aria-label="Notifications list" className="space-y-4">
          {activeNotifications.length > 0 ? (
            <div aria-live="polite">
              {activeNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </>
  );
}