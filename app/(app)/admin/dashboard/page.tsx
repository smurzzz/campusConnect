import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Admin dashboard — CampusConnect",
  description: "What’s happening across CampusConnect today.",
};

export default function AdminDashboardPage() {
  return <CampusPage page="admin-dashboard" />;
}
