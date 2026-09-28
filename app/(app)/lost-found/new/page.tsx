import type { Metadata } from "next";

import NewLostFoundPage from "./new-lost-found-page-client";

export const metadata: Metadata = {
  title: "Report an item — CampusConnect",
  description: "Help reunite campus items with their owners.",
};

export default function Page() {
  return <NewLostFoundPage />;
}
