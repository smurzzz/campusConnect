import type { Metadata } from "next";

import StaffLostFoundDetailPage from "./staff-lost-found-detail-page-client";

export const metadata: Metadata = {
  title: "Lost & Found Item — CampusConnect",
  description: "View and update lost & found item details.",
};

export default function Page() {
  return <StaffLostFoundDetailPage />;
}
