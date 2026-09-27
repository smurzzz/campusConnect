import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage events — CampusConnect",
  description: "Review and manage events across campus.",
};

export default function AdminEventsPage() {
  return <CampusPage page="admin-events" />;
}
