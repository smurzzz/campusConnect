"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, MapPin, UsersRound } from "lucide-react";
import { useSession } from "@clerk/nextjs";
import { toast } from "sonner";

import { CampusPage, PublicShell } from "@/components/campus-page";
// `PublicShell` is exported from campus-page for guest-visible detail screens.
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/clerk/use-role";
import { useEvent, useEventRegistration } from "@/lib/hooks/use-events";
import { getEventRegistrationCount } from "@/lib/events";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
}

export default function EventDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isSignedIn } = useSession();
  const role = useRole();
  const client = useSupabaseClient();

  const { event, loading, error } = useEvent(id);
  const { register, unregister } = useEventRegistration(id ?? null);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [myRegistration, setMyRegistration] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [countLoaded, setCountLoaded] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!id) return;
    setRegisteredCount(await getEventRegistrationCount(client, id));
    setCountLoaded(true);
  }, [client, id]);

  // Is the signed-in user already registered? RLS limits the read to their
  // own rows, so a hit means "yes".
  useEffect(() => {
    if (!id || !isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on sign-out, not a fetch
      setMyRegistration(false);
      return;
    }
    void client
      .from("event_registrations")
      .select("id")
      .eq("event_id", id)
      .maybeSingle()
      .then(({ data }) => setMyRegistration(Boolean(data)));
  }, [client, id, isSignedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void refreshCount();
  }, [refreshCount]);

  const handleRegister = async () => {
    setActionPending(true);
    try {
      const result = await register();
      if (!result.ok) {
        toast.error("Couldn't register", { description: result.error });
        return;
      }
      setMyRegistration(true);
      toast.success("You're registered!");
      await refreshCount();
    } finally {
      setActionPending(false);
    }
  };

  const handleUnregister = async () => {
    setActionPending(true);
    try {
      const result = await unregister();
      if (!result.ok) {
        toast.error("Couldn't cancel", { description: result.error });
        return;
      }
      setMyRegistration(false);
      toast.success("Registration cancelled");
      await refreshCount();
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <CampusPage page="event-detail">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </CampusPage>
    );
  }

  if (error || !event) {
    return (
      <CampusPage page="event-detail">
        {error ?? "Event not found."}
      </CampusPage>
    );
  }

  const capacity = event.capacity;
  const spotsLeft = capacity == null ? null : Math.max(0, capacity - registeredCount);
  const isFull = capacity != null && registeredCount >= capacity;
  const signedIn = isSignedIn === true;

  const body = (
    <>
      <Link href="/events" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft /> Back to events
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <article className="section-panel">
          {event.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.cover_image_url} alt="" className="mb-6 max-h-72 w-full rounded-md object-cover" />
          ) : (
            <div className="mb-6 grid h-40 place-items-center rounded-md bg-event-blue text-sm font-semibold text-primary">
              {event.category ?? "Campus event"}
            </div>
          )}
          <span className="category-badge">{event.category ?? "General"}</span>
          <h2 className="mt-3 text-2xl font-bold">{event.title}</h2>
          <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">
            {event.description || "No description has been added for this event yet."}
          </p>
        </article>

        <aside className="section-panel h-fit">
          <div className="space-y-4 text-sm">
            <p className="flex gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">Starts</strong>
                {formatDate(event.start_time)}
              </span>
            </p>
            <p className="flex gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <span>
                <strong className="block">Ends</strong>
                {formatDate(event.end_time)}
              </span>
            </p>
            <p className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <strong className="block">Location</strong>
                {event.location ?? "To be announced"}
              </span>
            </p>
          </div>

          {capacity != null && (
            <div className="my-6 border-t border-border pt-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">
                  {countLoaded ? registeredCount : "…"} / {capacity} registered
                </span>
                <span className="text-muted-foreground">
                  {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                </span>
              </div>
              <Progress value={capacity > 0 ? (registeredCount / capacity) * 100 : 0} />
            </div>
          )}

          {signedIn ? (
            myRegistration ? (
              <Button className="w-full" size="lg" variant="secondary" disabled={actionPending} onClick={() => void handleUnregister()}>
                <Check /> Registered — cancel?
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                disabled={actionPending || isFull}
                onClick={() => void handleRegister()}
              >
                <UsersRound />
                {isFull ? "Event is full" : "Register for this event"}
              </Button>
            )
          ) : (
            <Button className="w-full" size="lg" asChild>
              <Link href="/login?redirect_url=/events">Log in to register</Link>
            </Button>
          )}
          {role === "admin" && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Manage this event from{" "}
              <Link href={`/admin/events`} className="font-semibold text-primary hover:underline">
                Admin → Events
              </Link>
            </p>
          )}
        </aside>
      </div>
    </>
  );

  // Guests get the public shell; signed-in users keep the app sidebar.
  if (!signedIn) {
    return <PublicShell>{body}</PublicShell>;
  }
  return <CampusPage page="event-detail">{body}</CampusPage>;
}
