import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Registrants — CampusConnect",
  description: "Students registered for this event.",
};

export default function RegistrantsPage() {
  return <CampusPage page="registrants" />;
}
