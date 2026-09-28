"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CampusPage, StatusBadge } from "@/components/campus-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getLostFoundItem, updateLostFoundStatus, type LostFoundListItem } from "@/lib/lost-found";
import { toItemStatusLabel } from "@/lib/lost-found-labels";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

export default function StaffLostFoundDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const client = useSupabaseClient();

  const [item, setItem] = useState<LostFoundListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchItem = useCallback(async () => {
    if (!id) {
      setError("Item ID is missing");
      setLoading(false);
      return;
    }
    const result = await getLostFoundItem(client, id);
    if (result.error) setError(result.error);
    else if (!result.row) setError("Lost & found item not found");
    else setItem(result.row);
    setLoading(false);
  }, [client, id]);

  useEffect(() => {
    void fetchItem();
  }, [fetchItem]);

  const handleStatusChange = async (status: "reported" | "claimed") => {
    if (!item) return;
    setStatusLoading(true);
    try {
      const result = await updateLostFoundStatus(client, item.id, status);
      if (!result.ok) {
        toast.error("Failed to update status", { description: result.error });
        return;
      }
      setItem((prev) => (prev ? { ...prev, status } : prev));
      toast.success(
        status === "claimed"
          ? "Marked as claimed — the reporter has been notified"
          : "Marked as reported",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <CampusPage page="staff-lost-detail">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </CampusPage>
    );
  }

  if (error || !item) {
    return (
      <CampusPage page="staff-lost-detail">
        <p>{error ?? "Item not found"}</p>
      </CampusPage>
    );
  }

  return (
    <CampusPage page="staff-lost-detail">
      <Link
        href="/staff/lost-found"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft /> Back to lost & found
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="section-panel">
          {item.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photo_url} alt={`Photo of ${item.name}`} className="mb-5 max-h-80 w-full rounded-md object-cover" />
          ) : (
            <div className="mb-5 grid h-40 place-items-center rounded-md bg-muted text-sm text-muted-foreground">No photo</div>
          )}
          <h2 className="text-xl font-bold">{item.name}</h2>
          <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">
            {item.description || "No description was provided."}
          </p>
        </div>

        <aside className="section-panel h-fit">
          <h3 className="section-title">Item details</h3>
          <dl className="detail-list">
            <div>
              <dt>Type</dt>
              <dd className="capitalize">{item.type}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={toItemStatusLabel(item.status)} />
              </dd>
            </div>
            <div>
              <dt>Update status</dt>
              <dd>
                <div className="flex items-center gap-2">
                  <select
                    className="field-select w-full"
                    aria-label="Update status"
                    disabled={statusLoading}
                    value={item.status}
                    onChange={(event) => void handleStatusChange(event.target.value as "reported" | "claimed")}
                  >
                    <option value="reported">Reported</option>
                    <option value="claimed">Claimed</option>
                  </select>
                  {statusLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                </div>
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{item.category ?? "—"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{item.location ?? "—"}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{item.date ?? "—"}</dd>
            </div>
            <div>
              <dt>Reported by</dt>
              <dd>{item.reporter_name ?? "Unknown"}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </CampusPage>
  );
}
