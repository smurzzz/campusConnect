import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Reports & insights — CampusConnect",
  description: "Understand service performance across the campus.",
};

export default function AdminReportsPage() {
  return <CampusPage page="reports" />;
}
