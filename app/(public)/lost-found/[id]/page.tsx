import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Item — CampusConnect",
  description: "View a lost or found item report.",
};

export default function LostFoundDetailPage() {
  return <CampusPage page="lost-detail" />;
}
