"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { CampusPage, ConcernsTable, EmptyState } from "@/components/campus-page";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listConcerns, toConcernStatusLabel, type ConcernListItem } from "@/lib/concerns";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

/** Concern status values shown in the filter, mapped to stored values. */
const STATUS_FILTERS = [
  ["", "All statuses"],
  ["pending", "Pending"],
  ["in_progress", "In Progress"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
] as const;

export default function StaffConcernsPage() {
  const client = useSupabaseClient();
  const [concerns, setConcerns] = useState<ConcernListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    void (async () => {
      // RLS shows personnel/admin every concern; students only their own.
      const result = await listConcerns(client);
      if (result.error) setError(result.error);
      setConcerns(result.rows);
      setLoading(false);
    })();
  }, [client]);

  const filtered = concerns.filter((row) => {
    if (status && row.status !== status) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      row.subject.toLowerCase().includes(needle) ||
      (row.student_name ?? "").toLowerCase().includes(needle) ||
      (row.category ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <CampusPage
      page="staff-concerns"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search concerns by subject or student"
            aria-label="Search concerns"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="field-select"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading concerns">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No concerns found"
          text="Try changing your search or filters. New concerns will appear here when submitted."
        />
      ) : (
        <ConcernsTable
          staff
          items={filtered.map((row) => ({
            id: row.id,
            subject: row.subject,
            category: row.category,
            status: toConcernStatusLabel(row.status),
            submittedAt: new Date(row.created_at).toLocaleDateString(),
            studentName: row.student_name,
            assignee: row.assignee_name,
          }))}
        />
      )}
    </CampusPage>
  );
}
