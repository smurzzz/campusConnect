import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage lost & found — CampusConnect",
  description: "Review and manage lost and found reports across campus.",
};

export default function AdminLostFoundPage() {
  return <CampusPage page="admin-lost" />;
}
