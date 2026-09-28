"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { ManagementTable } from "@/components/campus-page";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Database["public"]["Tables"]["events"]["Row"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_registrations (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // The data will have an array of events, each with an event_registrations array (with a count property)
      // We want to add a registeredCount field to each event for easy access
      const eventsWithCount = data.map(event => ({
        ...event,
        registeredCount: event.event_registrations?.[0]?.count ?? 0
      }));
      setEvents(eventsWithCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="admin-events" />;
  if (error) return <CampusPage page="admin-events" >Error loading events: {error}</CampusPage>;

  return (
    <CampusPage page="admin-events">
      <ManagementTable kind="events" data={events} />
    </CampusPage>
  );
}