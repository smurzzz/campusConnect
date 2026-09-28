import type { Metadata } from "next";

import { AnnouncementDetail } from "@/components/announcements/announcement-detail";

export const metadata: Metadata = {
  title: "Announcement — CampusConnect",
  description: "Read the full announcement.",
};

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnnouncementDetail id={id} />;
}
