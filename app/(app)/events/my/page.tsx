import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "My events — CampusConnect",
  description: "Review and manage your registrations.",
};

export default function MyEventsPage() {
  return <CampusPage page="my-events" />;
}
