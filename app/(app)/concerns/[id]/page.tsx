import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Concern — CampusConnect",
  description: "Follow the conversation on your concern.",
};

export default function ConcernDetailPage() {
  return <CampusPage page="concern-detail" />;
}
