import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Access denied — CampusConnect",
  description: "Your account doesn’t have permission to view this area.",
};

export default function AccessDeniedPage() {
  return <CampusPage page="denied" />;
}
