"use client";

import { useEffect, useState } from "react";

import { CampusPage, LostFound } from "@/components/campus-page";
import { Skeleton } from "@/components/ui/skeleton";
import { listLostFoundItems, type LostFoundListItem } from "@/lib/lost-found";
import { useSupabaseClient } from "@/lib/hooks/use-supabase-client";

export default function LostFoundPage() {
  const client = useSupabaseClient();
  const [items, setItems] = useState<LostFoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await listLostFoundItems(client);
      if (result.error) setError(result.error);
      setItems(result.rows);
      setLoading(false);
    })();
  }, [client]);

  if (loading) {
    return (
      <CampusPage page="lost-found">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading items">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </CampusPage>
    );
  }

  if (error) {
    return (
      <CampusPage page="lost-found">
        Error loading lost & found items: {error}
      </CampusPage>
    );
  }

  return (
    <CampusPage page="lost-found">
      <LostFound items={items} />
    </CampusPage>
  );
}
