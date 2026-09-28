"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import type { NotificationRecord } from "@/types";

/**
 * Notification shape as it comes back from the `notifications` table:
 * (id, user_id, type, message, read, related_id, created_at).
 */
type NotificationRow = {
  id: string;
  user_id: string;
  type: string | null;
  message: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
};

const VALID_TYPES = new Set(["announcement", "concern", "event", "lost_found", "system"]);

/**
 * DB row → view model. The table has a single `message` column, so the
 * heading is split off the front of it at the " — " separator the triggers
 * write ("Subject — details…"); the rest becomes the body.
 */
function toRecord(row: NotificationRow): NotificationRecord {
  const separator = row.message.indexOf(" — ");
  const title = separator > 0 ? row.message.slice(0, separator) : "Notification";
  const body = separator > 0 ? row.message.slice(separator + 3) : row.message;
  const type = row.type && VALID_TYPES.has(row.type) ? (row.type as NotificationRecord["type"]) : "system";
  // Types are stored singular; routes are plural (announcement → /announcements/…).
  return {
    id: row.id,
    type,
    title,
    body,
    time: row.created_at,
    read: row.read,
    href: row.related_id && row.type ? `/${row.type}s/${row.related_id}` : null,
  };
}

/**
 * Live notification inbox for the signed-in user.
 *
 * Reads and writes go through the token-bound Supabase client so the
 * `notifications_select_own` policy can match `(auth.jwt() ->> 'sub')`
 * against `user_id` — the sessionless anon client saw zero rows. Realtime
 * pushes INSERTs and read-state UPDATEs into local state so the bell badge
 * updates without a refetch.
 */
export const useNotifications = () => {
  const { user, isLoaded } = useUser();
  const client = useSupabaseClient();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await client
        .from("notifications")
        .select("id, user_id, type, message, read, related_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      setNotifications((data ?? []).map(toRecord));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [client, user]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      try {
        const { error: updateError } = await client
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark as read");
        console.error("Error marking notification as read:", err);
      }
    },
    [client, user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error: updateError } = await client
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all as read");
      console.error("Error marking all notifications as read:", err);
    }
  }, [client, user]);

  // Initial load, then realtime. INSERT events prepend new rows (deduped);
  // UPDATE events reconcile read-state so every surface showing the bell
  // count stays in sync with the database.
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      // Resetting signed-out state is the effect's whole job here — there is
      // no other render-phase hook that can observe it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      setLoading(false);
      return;
    }

    void fetchNotifications();

    const channel = client
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) =>
            prev.some((n) => n.id === row.id) ? prev : [toRecord(row), ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? { ...n, read: row.read } : n)));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, isLoaded, user, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
};
