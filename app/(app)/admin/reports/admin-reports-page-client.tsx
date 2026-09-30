"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminDashboard } from "@/components/campus-page";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

/** Bucket shape the report charts render. */
type StatusCount = { status: string; count: number };
type AttendanceRow = { title: string; capacity: number | null; registration_count: number };

/** Groups rows by `status`, largest bucket first, nulls collapsed. */
function countByStatus(rows: { status: string | null }[] | null): StatusCount[] {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const bucket = row.status || "Unspecified";
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

/** Human-readable concern status for the chart legend. */
function concernLabel(value: string): string {
  switch (value) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    case "reported":
      return "Reported";
    case "claimed":
      return "Claimed";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const client = useSupabaseClient();
  const [concernsByStatus, setConcernsByStatus] = useState<StatusCount[]>([]);
  const [eventsAttendance, setEventsAttendance] = useState<AttendanceRow[]>([]);
  const [lostFoundResolution, setLostFoundResolution] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // Concerns and lost & found are tallied client-side from the single
        // status column (no GROUP BY in supabase-js); both tables are small.
        const [concernsResult, eventsResult, lostFoundResult] = await Promise.all([
          client.from("concerns").select("status"),
          client
            .from("events")
            .select("title, capacity, event_registrations(count)")
            .order("start_time", { ascending: false }),
          client.from("lost_found_items").select("status"),
        ]);

        if (concernsResult.error) throw concernsResult.error;
        if (eventsResult.error) throw eventsResult.error;
        if (lostFoundResult.error) throw lostFoundResult.error;

        setConcernsByStatus(countByStatus(concernsResult.data).map(({ status, count }) => ({ status: concernLabel(status), count })));
        setEventsAttendance(
          (eventsResult.data ?? []).map((row) => {
            const embed = row as { title: string; capacity: number | null; event_registrations?: Array<{ count: number }> | null };
            return {
              title: embed.title,
              capacity: embed.capacity,
              registration_count: embed.event_registrations?.[0]?.count ?? 0,
            };
          }),
        );
        setLostFoundResolution(countByStatus(lostFoundResult.data).map(({ status, count }) => ({ status: concernLabel(status), count })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, [client]);

  const exportCsv = () => {
    if (concernsByStatus.length === 0 && eventsAttendance.length === 0 && lostFoundResolution.length === 0) {
      toast.info("No report data to export yet");
      return;
    }

    const rows: string[][] = [["Report", "Item", "Count", "Total"]];
    for (const bucket of concernsByStatus) {
      rows.push(["Concerns by status", bucket.status, String(bucket.count), String(concernsByStatus.reduce((sum, b) => sum + b.count, 0))]);
    }
    for (const event of eventsAttendance) {
      rows.push(["Events by attendance", event.title, String(event.registration_count), event.capacity == null ? "unlimited" : String(event.capacity)]);
    }
    const itemTotal = lostFoundResolution.reduce((sum, b) => sum + b.count, 0);
    for (const bucket of lostFoundResolution) {
      rows.push(["Lost & found resolution", bucket.status, String(bucket.count), String(itemTotal)]);
    }

    downloadCsv(`campusconnect-reports-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Report exported as CSV");
  };

  // AdminDashboard owns its AppShell and the export button (via `onExport`) —
  // render it directly; a <CampusPage> wrapper would stack a second shell.
  return (
    <AdminDashboard
      reports
      loading={loading}
      error={error}
      onExport={exportCsv}
      stats={{
        totalUsers: concernsByStatus.reduce((sum, b) => sum + b.count, 0),
        activeConcerns: (concernsByStatus.find((b) => b.status === "Pending")?.count ?? 0) + (concernsByStatus.find((b) => b.status === "In Progress")?.count ?? 0),
        upcomingEvents: eventsAttendance.length,
        openItems: lostFoundResolution.find((b) => b.status === "Reported")?.count ?? 0,
      }}
      concernsByStatus={concernsByStatus}
      eventsAttendance={eventsAttendance.map((e) => ({ title: e.title, capacity: e.capacity ?? 0, event_registrations: [{ count: e.registration_count }] }))}
      lostFoundResolution={lostFoundResolution}
    />
  );
}
