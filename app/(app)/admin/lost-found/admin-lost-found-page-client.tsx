"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { CampusPage, EmptyState, StatusBadge } from "@/components/campus-page";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listLostFoundItems, type LostFoundDbStatus } from "@/lib/lost-found";
import { LostFoundRowActions } from "@/components/lost-found/lost-found-actions";
import { toItemStatusLabel } from "@/lib/lost-found-labels";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
}

export default function AdminLostFoundPage() {
  const client = useSupabaseClient();
  const [items, setItems] = useState<Awaited<ReturnType<typeof listLostFoundItems>>["rows"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await listLostFoundItems(client, { withReporter: true });
      if (result.error) setError(result.error);
      setItems(result.rows);
      setLoading(false);
    })();
  }, [client]);

  const filtered = items.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      (item.category ?? "").toLowerCase().includes(needle) ||
      (item.reporter_name ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <CampusPage page="admin-lost">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search lost & found reports"
            aria-label="Search reports"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="field-select"
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="">All types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
      </div>

      {error && (
        <div className="mb-5 rounded-md bg-danger-soft p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading reports">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No reports found" text="Try changing your search or filters." />
      ) : (
        <div className="table-shell">
          <div className="data-grid-row hidden bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1.6fr_0.7fr_1fr_1fr_0.8fr_auto]">
            <span>Item</span>
            <span>Type</span>
            <span>Category</span>
            <span>Reported by</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {filtered.map((item) => (
            <div key={item.id} className="data-grid-row md:grid-cols-[1.6fr_0.7fr_1fr_1fr_0.8fr_auto]">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(item.date)}</p>
              </div>
              <div className="text-sm capitalize text-muted-foreground">{item.type}</div>
              <div className="truncate text-sm text-muted-foreground">{item.category ?? "—"}</div>
              <div className="truncate text-sm text-muted-foreground">{item.reporter_name ?? "—"}</div>
              <div>
                <StatusBadge status={toItemStatusLabel(item.status)} />
              </div>
              <div className="flex justify-end">
                <LostFoundRowActions
                  client={client}
                  item={{ id: item.id, name: item.name, status: item.status }}
                  isAdmin
                  onUpdated={(id, status: LostFoundDbStatus) =>
                    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)))
                  }
                  onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
                />
                <Link
                  href={`/staff/lost-found/${item.id}`}
                  className="inline-flex items-center gap-1 px-1 text-sm font-semibold text-primary hover:underline"
                  aria-label={`Review ${item.name}`}
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </CampusPage>
  );
}
