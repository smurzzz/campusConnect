import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Concern — CampusConnect",
  description: "Reply to the student and update the status.",
};

export default function StaffConcernDetailPage() {
  return <CampusPage page="staff-concern-detail" />;
}
