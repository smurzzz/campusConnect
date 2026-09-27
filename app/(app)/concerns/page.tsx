import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "My concerns — CampusConnect",
  description: "Track every request from submission to resolution.",
};

export default function ConcernsPage() {
  return <CampusPage page="concerns" />;
}
