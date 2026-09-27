import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Announcements — CampusConnect",
  description: "News and important information from across the university.",
};

export default function AnnouncementsPage() {
  return <CampusPage page="announcements" />;
}
