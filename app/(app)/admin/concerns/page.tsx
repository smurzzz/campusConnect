import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage concerns — CampusConnect",
  description: "Review and manage concerns across campus.",
};

export default function AdminConcernsPage() {
  return <CampusPage page="admin-concerns" />;
}
