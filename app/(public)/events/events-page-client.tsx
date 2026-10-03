"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { EmptyState, EventCards } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useEvents } from "@/lib/hooks/use-events";
import { EVENT_CATEGORIES } from "@/lib/constants/categories";
import { ALL_OPTION } from "@/lib/constants/statuses";

const CATEGORY_OPTIONS = [ALL_OPTION, ...EVENT_CATEGORIES] as const;

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_OPTION);
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search);

  const { events, totalPages, loading, error } = useEvents({
    search: debouncedSearch,
    category,
    page,
    upcomingOnly: true,
  });

  const resetPaging = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  // The server page wraps this in PublicPage (guest shell / member AppShell),
  // so this renders its content only — a CampusPage wrapper here would stack
  // a second shell.
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Input
            className="pl-9"
            placeholder="Search events by title or location"
            aria-label="Search events"
            value={search}
            onChange={(event) => resetPaging(setSearch)(event.target.value)}
          />
        </div>
        <select
          className="field-select"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => resetPaging(setCategory)(event.target.value)}
        >
          {CATEGORY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === ALL_OPTION ? "All categories" : value}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" role="status" aria-busy="true" aria-label="Loading events">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          text="Nothing matches your search yet. Check back soon, or clear the filters."
        />
      ) : (
        <>
          <EventCards items={events} register />
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        Looking for an event you joined?{" "}
        <Link href="/events/my" className="font-semibold text-primary hover:underline">
          View My Events
        </Link>
      </p>
    </>
  );
}
