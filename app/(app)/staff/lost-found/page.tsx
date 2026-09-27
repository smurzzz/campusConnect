import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Lost & Found management — CampusConnect",
  description: "Review reports and update item status.",
};

export default function StaffLostFoundPage() {
  return <CampusPage page="staff-lost" />;
}
