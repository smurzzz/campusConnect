import type { Metadata } from "next";

import AdminDashboardPage from "./admin-dashboard-page-client";

export const metadata: Metadata = {
  title: "Admin dashboard — CampusConnect",
  description: "What’s happening across CampusConnect today.",
};

export default function Page() {
  return <AdminDashboardPage />;
}
