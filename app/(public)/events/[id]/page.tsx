import type { Metadata } from "next";

import EventDetailClient from "./event-detail-client";

export const metadata: Metadata = {
  title: "Event — CampusConnect",
  description: "View event details and register.",
};

export default function EventDetailPage() {
  return <EventDetailClient />;
}
