import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Events — CampusConnect",
  description: "Discover workshops, activities, and moments to connect.",
};

export default function EventsPage() {
  return <CampusPage page="events" />;
}
