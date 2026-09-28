import type { Metadata } from "next";

import AdminEventsPage from "./admin-events-page-client";

export const metadata: Metadata = {
  title: "Manage events — CampusConnect",
  description: "Review and manage events across campus.",
};

export default function Page() {
  return <AdminEventsPage />;
}
