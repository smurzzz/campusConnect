import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Report an item — CampusConnect",
  description: "Help reunite campus items with their owners.",
};

export default function NewLostFoundPage() {
  return <CampusPage page="lost-new" />;
}
