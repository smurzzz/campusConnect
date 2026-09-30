import type { Metadata } from "next";

import { PublicPage } from "@/components/campus-page";

import EventsPage from "./events-page-client";

export const metadata: Metadata = {
  title: "Events — CampusConnect",
  description: "Discover workshops, activities, and moments to connect.",
};

export default function Page() {
  // PublicPage picks the guest shell or the member AppShell (with the nav
  // for the viewer's real role), matching the announcements page.
  return (
    <PublicPage
      title="Campus events"
      text="Discover workshops, activities, and moments to connect."
    >
      <EventsPage />
    </PublicPage>
  );
}
