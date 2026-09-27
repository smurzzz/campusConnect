import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Dashboard — CampusConnect",
  description: "Your campus updates at a glance.",
};

export default function StudentDashboardPage() {
  return <CampusPage page="dashboard" />;
}
