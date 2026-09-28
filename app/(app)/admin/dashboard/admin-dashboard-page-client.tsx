"use client";

import { useEffect, useState } from "react";

import { AdminDashboard, CampusPage } from "@/components/campus-page";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

export default function AdminDashboardPage() {
  const client = useSupabaseClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeConcerns: 0,
    upcomingEvents: 0,
    openItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // `count: 'exact', head: true` returns only the number — no rows.
        // Concern statuses are lowercase; the concern list uses the same
        // vocabulary via `toConcernDbStatus`.
        const [usersResult, concernsResult, eventsResult, lostFoundResult] = await Promise.all([
          client.from("users").select("id", { count: "exact", head: true }),
          client
            .from("concerns")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "in_progress"]),
          client
            .from("events")
            .select("id", { count: "exact", head: true })
            .gte("start_time", new Date().toISOString()),
          client
            .from("lost_found_items")
            .select("id", { count: "exact", head: true })
            .eq("status", "reported"),
        ]);

        if (usersResult.error) throw usersResult.error;
        if (concernsResult.error) throw concernsResult.error;
        if (eventsResult.error) throw eventsResult.error;
        if (lostFoundResult.error) throw lostFoundResult.error;

        setStats({
          totalUsers: usersResult.count ?? 0,
          activeConcerns: concernsResult.count ?? 0,
          upcomingEvents: eventsResult.count ?? 0,
          openItems: lostFoundResult.count ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    })();
  }, [client]);

  return (
    <CampusPage page="admin-dashboard">
      {loading ? null : error ? (
        <div className="rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      ) : (
        <AdminDashboard stats={stats} />
      )}
    </CampusPage>
  );
}
