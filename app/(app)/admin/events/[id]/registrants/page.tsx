import type { Metadata } from "next";

import RegistrantsClient from "./registrants-client";

export const metadata: Metadata = {
  title: "Registrants — CampusConnect",
  description: "Students registered for this event.",
};

export default function RegistrantsPage() {
  return <RegistrantsClient />;
}
