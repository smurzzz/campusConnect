import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Event — CampusConnect",
  description: "View event details and register.",
};

export default function EventDetailPage() {
  return <CampusPage page="event-detail" />;
}
