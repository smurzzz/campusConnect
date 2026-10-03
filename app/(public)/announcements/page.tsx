import type { Metadata } from "next";

import { AnnouncementList } from "@/components/announcements/announcement-list";
import { PublicPage } from "@/components/campus-page";
import { listAnnouncements } from "@/lib/announcements";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Announcements — CampusConnect",
  description: "News and important information from across the university.",
};

// Fetch per request so the list in SSR HTML is always current.
export const dynamic = "force-dynamic";

/**
 * Server-fetch the first page of published announcements so list content is
 * in the initial HTML (Lighthouse LCP) instead of arriving after hydration.
 * On failure the client-side hook takes over as before.
 */
async function fetchInitialAnnouncements() {
  try {
    const result = await listAnnouncements(supabase);
    return result.error ? undefined : result;
  } catch {
    return undefined;
  }
}

export default async function AnnouncementsPage() {
  const initial = await fetchInitialAnnouncements();
  return (
    <PublicPage
      title="Announcements"
      text="News and important information from across the university."
    >
      <AnnouncementList initial={initial} />
    </PublicPage>
  );
}
