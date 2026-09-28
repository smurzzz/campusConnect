"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { CampusPage } from "@/components/campus-page";
import { EventCards } from "@/components/campus-page";

export default function EventsPage() {
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
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CampusPage page="events" />;
  if (error) return <CampusPage page="events" >Error loading events: {error}</CampusPage>;

  return (
    <CampusPage page="events">
      <EventCards items={events} />
    </CampusPage>
  );
}