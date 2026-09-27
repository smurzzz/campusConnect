import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Manage users — CampusConnect",
  description: "Review and manage users across campus.",
};

export default function AdminUsersPage() {
  return <CampusPage page="admin-users" />;
}
