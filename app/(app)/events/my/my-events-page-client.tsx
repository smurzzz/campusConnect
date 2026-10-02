"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import { CampusPage, EmptyState, StatusBadge } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyRegistrations } from "@/lib/hooks/use-events";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import { unregisterFromEvent } from "@/lib/events";

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function MyEventsPage() {
  const client = useSupabaseClient();
  const { registrations, loading, error, refresh } = useMyRegistrations();
  const [pendingId, setPendingId] = useState<string | null>(null);
  // "Now" sampled once per mount and refreshed every minute, so the
  // Past/Upcoming badge never reads an impure clock during render.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = async (eventId: string) => {
    setPendingId(eventId);
    try {
      const result = await unregisterFromEvent(client, eventId);
      if (!result.ok) {
        toast.error("Couldn't cancel registration", { description: result.error });
        return;
      }
      toast.success("Registration cancelled");
      await refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <CampusPage page="my-events">
      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading your events">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <EmptyState
          title="You're not registered for any events"
          text="Browse campus events and register for the ones you want to attend."
          action={
            <Button asChild>
              <Link href="/events">
                <Plus /> Browse events
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {registrations.map(({ id, event, registered_at }) => {
            if (!event) return null;
            const startsAt = new Date(event.start_time);
            const past = startsAt.getTime() < now;

            return (
              <div className="content-card flex flex-col justify-between gap-4 sm:flex-row sm:items-center" key={id}>
                <div className="flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">
                    {startsAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">
                      <Link href={`/events/${event.id}`} className="hover:text-primary hover:underline">
                        {event.title}
                      </Link>
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-4" /> {formatWhen(event.start_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-4" /> {event.location ?? "TBA"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registered {formatWhen(registered_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={past ? "Past" : "Upcoming"} />
                  {!past && (
                    <Button
                      variant="outline"
                      disabled={pendingId === event.id}
                      onClick={() => void handleCancel(event.id)}
                    >
                      {pendingId === event.id ? "Cancelling…" : "Cancel registration"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CampusPage>
  );
}
