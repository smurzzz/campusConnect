import type { Metadata } from "next";

import CampusIdsPage from "./campus-ids-page-client";

export const metadata: Metadata = {
  title: "Campus IDs — CampusConnect",
  description: "Allocate campus IDs and track which have been claimed.",
};

export default function AdminCampusIdsPage() {
  return <CampusIdsPage />;
}
