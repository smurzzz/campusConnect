import type { Metadata } from "next";

import { AnnouncementList } from "@/components/announcements/announcement-list";
import { PublicPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Announcements — CampusConnect",
  description: "News and important information from across the university.",
};

export default function AnnouncementsPage() {
  return (
    <PublicPage
      title="Announcements"
      text="News and important information from across the university."
    >
      <AnnouncementList />
    </PublicPage>
  );
}
