import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Notifications — CampusConnect",
  description: "Updates that need your attention.",
};

export default function NotificationsPage() {
  return <CampusPage page="notifications" />;
}
