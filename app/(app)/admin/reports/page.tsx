import type { Metadata } from "next";

import AdminReportsPage from "./admin-reports-page-client";

export const metadata: Metadata = {
  title: "Reports & insights — CampusConnect",
  description: "Understand service performance across the campus.",
};

export default function Page() {
  return <AdminReportsPage />;
}
