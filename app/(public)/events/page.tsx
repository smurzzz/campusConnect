import type { Metadata } from "next";

import EventsPage from "./events-page-client";

export const metadata: Metadata = {
  title: "Events — CampusConnect",
  description: "Discover workshops, activities, and moments to connect.",
};

export default function Page() {
  return <EventsPage />;
}
