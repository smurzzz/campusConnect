import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage announcements — CampusConnect",
  description: "Review and manage announcements across campus.",
};

export default function AdminAnnouncementsPage() {
  return <CampusPage page="admin-announcements" />;
}
