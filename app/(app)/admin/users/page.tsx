import type { Metadata } from "next";

import AdminUsersPage from "./admin-users-page-client";

export const metadata: Metadata = {
  title: "Manage users — CampusConnect",
  description: "Review and manage users across campus.",
};

export default function Page() {
  return <AdminUsersPage />;
}
