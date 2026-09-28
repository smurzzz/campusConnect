"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { AdminDashboard } from "@/components/campus-page";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeConcerns: 0,
    upcomingEvents: 0,
    openItems: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch counts for dashboard stats
      const [usersResult, concernsResult, eventsResult, lostFoundResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('concerns').select('id', { count: 'exact' }).in('status', ['Pending', 'In Progress']),
        supabase.from('events').select('id', { count: 'exact' }).gte('start_time', new Date().toISOString()),
        supabase.from('lost_found_items').select('id', { count: 'exact' }).eq('status', 'reported')
      ]);

      if (usersResult.error) throw usersResult.error;
      if (concernsResult.error) throw concernsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (lostFoundResult.error) throw lostFoundResult.error;

      setStats({
        totalUsers: usersResult.count || 0,
        activeConcerns: concernsResult.count || 0,
        upcomingEvents: eventsResult.count || 0,
        openItems: lostFoundResult.count || 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="admin-dashboard" />;
  if (error) return <CampusPage page="admin-dashboard" >Error loading dashboard: {error}</CampusPage>;

  return (
    <CampusPage page="admin-dashboard">
      <AdminDashboard reports={false} />
    </CampusPage>
  );
}