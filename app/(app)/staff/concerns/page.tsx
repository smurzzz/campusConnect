import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "All concerns — CampusConnect",
  description: "Review, update, and respond to student concerns.",
};

export default function StaffConcernsPage() {
  return <CampusPage page="staff-concerns" />;
}
