import type { Metadata } from "next";

import LostFoundDetailClient from "./lost-found-detail-client";

export const metadata: Metadata = {
  title: "Item — CampusConnect",
  description: "View a lost or found item report.",
};

export default function LostFoundDetailPage() {
  return <LostFoundDetailClient />;
}
