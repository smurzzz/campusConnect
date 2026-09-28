"use client";

import { useEffect, useState } from "react";

import { CampusPage } from "@/components/campus-page";
import { supabase } from "@/lib/supabase";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

/** Bucket shape the report charts render. */
type StatusCount = { status: string; count: number };

/** Groups rows by `status` and returns them largest-bucket first. */
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

export default function AdminReportsPage() {
  const [concernsByStatus, setConcernsByStatus] = useState<StatusCount[]>([]);
  const [eventsAttendance, setEventsAttendance] = useState<any[]>([]);
  const [lostFoundResolution, setLostFoundResolution] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Concerns by status. `PostgrestFilterBuilder.group()` does not exist in
      // supabase-js 2.117, so this tallies the single column it needs here.
      // Move this into a Postgres view once these tables outgrow a few
      // thousand rows.
      const { data: concernRows, error: concernsError } = await supabase
        .from('concerns')
        .select('status');

      if (concernsError) throw concernsError;

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('title, capacity, event_registrations!inner(count)')
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;

      const { data: itemRows, error: lostFoundError } = await supabase
        .from('lost_found_items')
        .select('status');

      if (lostFoundError) throw lostFoundError;

      setConcernsByStatus(countByStatus(concernRows));
      setEventsAttendance(eventsData ?? []);
      setLostFoundResolution(countByStatus(itemRows));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="reports" />;
  if (error) return <CampusPage page="reports" >Error loading reports: {error}</CampusPage>;

  return (
    <CampusPage page="reports">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border rounded-lg p-4">
            <h3 className="mb-4 font-semibold">Concerns by Status</h3>
            <div className="space-y-3">
              {concernsByStatus.map((item) => (
                <div key={item.status} className="flex justify-between">
                  <span>{item.status}</span>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="mb-4 font-semibold">Events Attendance</h3>
            <div className="space-y-3">
              {eventsAttendance.map((event) => (
                <div key={event.id} className="flex justify-between space-x-2">
                  <div>
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <div className="text-right space-x-2">
                    <span>{event.event_registrations?.[0]?.count ?? 0}/{event.capacity}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(event.event_registrations?.[0]?.count ?? 0) / event.capacity * 100}% full)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="mb-4 font-semibold">Lost & Found Resolution Rate</h3>
          <div className="space-y-3">
            {lostFoundResolution.map((item) => (
              <div key={item.status} className="flex justify-between">
                <span>{item.status}</span>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CampusPage>
  );
}