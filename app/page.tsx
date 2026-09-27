import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "CampusConnect — Your campus, connected",
  description: "Campus updates, events, concerns, and lost and found in one trusted place.",
};

export default function HomePage() {
  return <CampusPage page="home" />;
}
