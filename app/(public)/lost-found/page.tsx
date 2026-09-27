import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Lost & Found — CampusConnect",
  description: "Browse recent reports or help return an item.",
};

export default function LostFoundPage() {
  return <CampusPage page="lost-found" />;
}
