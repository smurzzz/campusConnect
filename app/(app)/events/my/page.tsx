import type { Metadata } from "next";

import MyEventsPage from "./my-events-page-client";

export const metadata: Metadata = {
  title: "My events — CampusConnect",
  description: "Review and manage your registrations.",
};

export default function Page() {
  return <MyEventsPage />;
}
