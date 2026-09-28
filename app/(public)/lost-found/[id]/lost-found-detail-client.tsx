"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin } from "lucide-react";

import { CampusPage, PublicShell, StatusBadge } from "@/components/campus-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getLostFoundItem, type LostFoundListItem } from "@/lib/lost-found";
import { toItemStatusLabel } from "@/lib/lost-found-labels";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function LostFoundDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const client = useSupabaseClient();

  const [item, setItem] = useState<LostFoundListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Item ID is missing");
      setLoading(false);
      return;
    }
    void (async () => {
      const result = await getLostFoundItem(client, id);
      if (result.error) setError(result.error);
      else setItem(result.row);
      setLoading(false);
    })();
  }, [client, id]);

  if (loading) {
    return (
      <CampusPage page="lost-detail">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </CampusPage>
    );
  }

  if (error || !item) {
    return (
      <CampusPage page="lost-detail">
        <p>{error ?? "Item not found"}</p>
      </CampusPage>
    );
  }

  const body = (
    <>
      <Link
        href="/lost-found"
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
            <div className="mb-5 grid h-40 place-items-center rounded-md bg-muted text-5xl">🔎</div>
          )}
          <span className="category-badge">{item.category ?? "General"}</span>
          <h2 className="mt-3 text-2xl font-bold">{item.name}</h2>
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
              <dt>Location</dt>
              <dd className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                {item.location ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(item.date)}</dd>
            </div>
            <div>
              <dt>Reported</dt>
              <dd>{formatDate(item.created_at)}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-md bg-primary-soft p-3 text-xs text-primary">
            To claim or get help with this item, contact the campus Lost & Found desk or{" "}
            <Link href="/login" className="font-semibold underline">
              log in
            </Link>{" "}
            to message the reporter.
          </p>
          <Link
            href="/login"
            className="mt-4 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Mail className="size-4" /> Message reporter
          </Link>
        </aside>
      </div>
    </>
  );

  return <PublicShell>{body}</PublicShell>;
}
