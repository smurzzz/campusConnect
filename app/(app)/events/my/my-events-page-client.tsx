"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CampusPage } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { registerForEvent, unregisterFromEvent, getEventRegistrations } from "@/lib/actions";

export default function MyEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    fetchMyEvents();
  }, [user]);

  const fetchMyEvents = async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          registered_at,
          status,
          event:events!event_registrations_event_id_fkey (
            id,
            title,
            description,
            category,
            location,
            start_time,
            end_time,
            capacity,
            cover_image_url,
            created_by
          )
        `)
        .eq('student_id', user.id)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Format the data for easier consumption
      const formattedEvents = data.map((registration: any) => ({
        id: registration.event.id,
        title: registration.event.title,
        description: registration.event.description,
        category: registration.event.category,
        location: registration.event.location,
        startTime: registration.event.start_time,
        endTime: registration.event.end_time,
        capacity: registration.event.capacity,
        coverImageUrl: registration.event.cover_image_url,
        registeredAt: registration.registered_at,
        registrationStatus: registration.status,
      }));

      setEvents(formattedEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    try {
      await registerForEvent(eventId);
      await fetchMyEvents(); // Refresh the list
      toast.success("Successfully registered for event!");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register for event');
      toast.error("Failed to register for event");
    }
  };

  const handleUnregister = async (eventId: string) => {
    try {
      await unregisterFromEvent(eventId);
      await fetchMyEvents(); // Refresh the list
      toast.success("Successfully unregistered from event");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unregister from event');
      toast.error("Failed to unregister from event");
    }
  };

  if (loading) return <CampusPage page="my-events" />;
  if (error) return <CampusPage page="my-events" >{error}</CampusPage>;

  return (
    <CampusPage page="my-events">
      <div className="space-y-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">You haven't registered for any events yet.</p>
            <Button asChild>
              <Link href="/events">Browse upcoming events</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border rounded-lg p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{event.title}</h2>
                  <p className="text-sm text-muted-foreground mb-2">{event.category}</p>
                </div>
                <div className="grid gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">When</p>
                    <p className="text-base">
                      {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Where</p>
                    <p className="text-base">{event.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                    <p className="text-base">{/* TODO: Get actual registered count */} / {event.capacity}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-base text-muted-foreground">{event.description}</p>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleUnregister(event.id)}
                    className="w-[160px]"
                  >
                    Unregister
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CampusPage>
  );
}