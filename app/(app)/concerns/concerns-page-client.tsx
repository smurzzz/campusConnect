"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { CampusPage, ConcernsTable, EmptyState } from "@/components/campus-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";
import { listConcerns, toConcernStatusLabel, type ConcernListItem } from "@/lib/concerns";

const STATUS_FILTERS = [
  ["", "All statuses"],
  ["pending", "Pending"],
  ["in_progress", "In Progress"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
] as const;

export default function ConcernsPage() {
  const { user, isLoaded } = useUser();
  const client = useSupabaseClient();
  const [concerns, setConcerns] = useState<ConcernListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  // Distinct categories present in the student's own concerns, so the
  // dropdown only ever offers filters that can actually match something.
  const categories = useMemo(
    () => [...new Set(concerns.map((row) => row.category).filter((value): value is string => Boolean(value)))].sort(),
    [concerns],
  );

  useEffect(() => {
    if (!isLoaded || !user) return;

    void (async () => {
      const result = await listConcerns(client, { studentId: user.id });
      if (result.error) setError(result.error);
      setConcerns(result.rows);
      setLoading(false);
    })();
  }, [client, isLoaded, user]);

  // Derived loading flag: keep the skeleton until Clerk has a user (or there
  // definitively is none), instead of clearing state inside the effect.
  const showLoading = loading && (!isLoaded || Boolean(user));

  const filtered = concerns.filter((row) => {
    if (status && row.status !== status) return false;
    if (category && row.category !== category) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return row.subject.toLowerCase().includes(needle);
  });

  return (
    <CampusPage
      page="concerns"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search my concerns" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select className="field-select" aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="field-select" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUS_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button asChild>
          <Link href="/concerns/new">
            <Plus />
            Submit concern
          </Link>
        </Button>
      </div>

      {error && <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>}

      {showLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading concerns">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 && concerns.length === 0 ? (
        <EmptyState
          title="No concerns yet"
          text="When something on campus needs fixing, raise it here and the right team will pick it up."
          action={
            <Button asChild>
              <Link href="/concerns/new">
                <Plus />
                Submit a Concern
              </Link>
            </Button>
          }
        />
      ) : (
        <ConcernsTable
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
