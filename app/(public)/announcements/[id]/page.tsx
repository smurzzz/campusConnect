import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Announcement — CampusConnect",
  description: "Read the full announcement.",
};

export default function AnnouncementDetailPage() {
  return <CampusPage page="announcement-detail" />;
}
