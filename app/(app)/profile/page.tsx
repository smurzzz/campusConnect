import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Profile — CampusConnect",
  description: "Keep your contact information up to date.",
};

export default function ProfilePage() {
  return <CampusPage page="profile" />;
}
