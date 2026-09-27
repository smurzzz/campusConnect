import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Campus IDs — CampusConnect",
  description: "Allocate campus IDs and track which have been claimed.",
};

export default function AdminCampusIdsPage() {
  return <CampusPage page="admin-users" />;
}
