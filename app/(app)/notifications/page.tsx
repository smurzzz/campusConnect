import type { Metadata } from "next";

import NotificationsPage from "./notifications-page-client";

export const metadata: Metadata = {
  title: "Notifications — CampusConnect",
  description: "Updates that need your attention.",
};

export default function Page() {
  return <NotificationsPage />;
}
