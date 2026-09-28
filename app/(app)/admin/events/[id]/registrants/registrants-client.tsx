"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

import { CampusPage, EmptyState } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventRegistrationCount, registrantsToCsv } from "@/lib/events";
import { useEvent, useRegistrants } from "@/lib/hooks/use-events";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

export default function RegistrantsClient() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const client = useSupabaseClient();

  const { event } = useEvent(eventId);
  const { registrants, loading, error, refresh } = useRegistrants(eventId);
  const [capacity, setCapacity] = useState<number | null>(event?.capacity ?? null);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [search, setSearch] = useState("");

  const refreshCount = useCallback(async () => {
    if (!eventId) return;
    setRegisteredCount(await getEventRegistrationCount(client, eventId));
  }, [client, eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState only after await
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (event?.capacity != null)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local override when the event loads
      setCapacity(event.capacity);
  }, [event?.capacity]);

  const filtered = registrants.filter((row) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      (row.student_name ?? "").toLowerCase().includes(needle) ||
      (row.student_email ?? "").toLowerCase().includes(needle) ||
      (row.student_campus_id ?? "").toLowerCase().includes(needle)
    );
  });

  const exportCsv = () => {
    if (registrants.length === 0) {
      toast.info("Nothing to export yet");
      return;
    }
    const csv = registrantsToCsv(registrants);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `registrants-${event?.title ?? eventId}.csv`.replace(/[^a-z0-9.\-_ ]/gi, "_");
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Registrant list downloaded");
  };

  return (
    <CampusPage
      page="registrants"
    >
      <div className="mb-5">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft /> Back to events
        </Link>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold">{event?.title ?? "Event"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {capacity == null
              ? `${registeredCount} registered (no capacity limit)`
              : `${registeredCount} of ${capacity} seats filled.`}
          </p>
        </div>
        <Button onClick={exportCsv}>
          <Download />
          Export list
        </Button>
      </div>

      <div className="mb-6 max-w-sm">
        <Input
          placeholder="Search registered students"
          aria-label="Search registrants"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading registrants">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No registrants found"
          text="When students register for this event, their names will appear here."
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        />
      ) : (
        <div className="table-shell">
          <div className="data-grid-row hidden bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1.6fr_1.6fr_1fr_1fr]">
            <span>Student</span>
            <span>Email</span>
            <span>Campus ID</span>
            <span>Registered</span>
          </div>
          {filtered.map((row) => (
            <div key={row.id} className="data-grid-row md:grid-cols-[1.6fr_1.6fr_1fr_1fr]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                  {(row.student_name ?? "?").charAt(0).toUpperCase()}
                </span>
                <span className="font-semibold">{row.student_name ?? "Unknown student"}</span>
              </div>
              <div className="truncate text-sm text-muted-foreground">{row.student_email ?? "—"}</div>
              <div className="text-sm text-muted-foreground">{row.student_campus_id ?? "—"}</div>
              <div className="text-sm text-muted-foreground">{formatDate(row.registered_at)}</div>
            </div>
          ))}
        </div>
      )}
    </CampusPage>
  );
}
