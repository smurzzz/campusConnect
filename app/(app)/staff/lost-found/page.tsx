import type { Metadata } from "next";

import StaffLostFoundPage from "./staff-lost-found-page-client";

export const metadata: Metadata = {
  title: "Lost & Found management — CampusConnect",
  description: "Review reports and update item status.",
};

export default function Page() {
  return <StaffLostFoundPage />;
}
