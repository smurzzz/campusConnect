import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Personnel dashboard — CampusConnect",
  description: "Manage incoming requests and assigned work.",
};

export default function StaffDashboardPage() {
  return <CampusPage page="staff-dashboard" />;
}
