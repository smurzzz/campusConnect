import type { Metadata } from "next";
import { useEffect, useState } from "react";

import { CampusPage } from "@/components/campus-page";
import { supabase } from "@/lib/supabase";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports & insights — CampusConnect",
  description: "Understand service performance across the campus.",
};

export default function AdminReportsPage() {
  const [concernsByStatus, setConcernsByStatus] = useState<any[]>([]);
  const [eventsAttendance, setEventsAttendance] = useState<any[]>([]);
  const [lostFoundResolution, setLostFoundResolution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Fetch concerns by status
      const { data: concernsData, error: concernsError } = await supabase
        .from('concerns')
        .select('status, count')
        .group('status');

      if (concernsError) throw concernsError;

      // Fetch events attendance
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('title, capacity, event_registrations!inner(count)')
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch lost & found resolution rate
      const { data: lostFoundData, error: lostFoundError } = await supabase
        .from('lost_found_items')
        .select('status, count')
        .group('status');

      if (lostFoundError) throw lostFoundError;

      setConcernsByStatus(concernsData);
      setEventsAttendance(eventsData);
      setLostFoundResolution(lostFoundData);
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
