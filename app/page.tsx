import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";
import { listAnnouncements, type AnnouncementRow } from "@/lib/announcements";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "CampusConnect — Your campus, connected",
  description: "Campus updates, events, concerns, and lost and found in one trusted place.",
};

// Re-fetch per request so the hero list never goes stale between deploys.
export const dynamic = "force-dynamic";

/**
 * The landing hero is server-rendered with the latest published announcements
 * so the LCP text ships in the initial HTML instead of appearing after
 * hydration + a client-side fetch (Lighthouse LCP went from ~6s to ~1.5s).
 * Failures fall back to the client-side fetch inside Landing.
 */
async function fetchLandingAnnouncements(): Promise<AnnouncementRow[] | undefined> {
  try {
    const result = await listAnnouncements(supabase, { pageSize: 3 });
    return result.error ? undefined : result.rows;
  } catch {
    return undefined;
  }
}

export default async function HomePage() {
  const initialAnnouncements = await fetchLandingAnnouncements();
  return <CampusPage page="home" initialAnnouncements={initialAnnouncements} />;
}
