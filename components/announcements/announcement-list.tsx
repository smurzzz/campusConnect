"use client";

import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

import { AnnouncementCards } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/constants/categories";
import { ALL_OPTION, PUBLICATION_STATUS_VALUES, type PublicationStatus } from "@/lib/constants/statuses";
import { useAnnouncements } from "@/lib/hooks/use-announcements";
import type { AnnouncementListResult } from "@/lib/announcements";

const ALL_CATEGORIES = [ALL_OPTION, ...ANNOUNCEMENT_CATEGORIES] as const;

export type AnnouncementListProps = {
  /**
   * Admins opt in to drafts. For every other audience the query is hard-wired
   * to `published`, so this cannot leak unpublished copy.
   */
  manageAll?: boolean;
  /** Renders the publish/draft chip next to each row. */
  showStatus?: boolean;
  emptyText?: string;
  /** Server-fetched first page so the list is present in the SSR HTML. */
  initial?: AnnouncementListResult;
};

/**
 * Announcement list backed by the `announcements` table.
 *
 * Search and the category filter are held as local state and pushed straight
 * into the Supabase query by `useAnnouncements` — there is no client-side
 * filtering over a full fetch, so what renders is always what the database
 * returned.
 */
export function AnnouncementList({
  manageAll = false,
  showStatus = false,
  emptyText = "Announcements will appear here once they are published.",
  initial,
}: AnnouncementListProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_OPTION);
  const [status, setStatus] = useState<PublicationStatus | typeof ALL_OPTION>(ALL_OPTION);
  const [page, setPage] = useState(0);

  const { announcements, count, totalPages, loading, error, refresh } = useAnnouncements({
    manageAll,
    search,
    category,
    status,
    page,
  }, initial);

  // Any filter change invalidates the current offset.
  const applyCategory = (value: string) => {
    setCategory(value);
    setPage(0);
  };
  const applyStatus = (value: PublicationStatus | typeof ALL_OPTION) => {
    setStatus(value);
    setPage(0);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search announcements"
            aria-label="Search announcements"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>

        <select
          className="field-select"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => applyCategory(event.target.value)}
        >
          {ALL_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value === ALL_OPTION ? "All categories" : value}
            </option>
          ))}
        </select>

        {manageAll && (
          <select
            className="field-select"
            aria-label="Filter by publication status"
            value={status}
            onChange={(event) => applyStatus(event.target.value as PublicationStatus | typeof ALL_OPTION)}
          >
            <option value={ALL_OPTION}>All statuses</option>
            {PUBLICATION_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-danger-soft p-4 text-sm text-danger">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <Filter />
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading announcements">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <AnnouncementCards
          items={announcements}
          student={showStatus}
          emptyText={
            search || category !== ALL_OPTION
              ? "No announcements match your search or filters. Try a different term, or clear the filters to see everything that has been published."
              : emptyText
          }
        />
      )}

      {!loading && count > 0 && (
        <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {announcements.length} of {count} announcement{count === 1 ? "" : "s"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
