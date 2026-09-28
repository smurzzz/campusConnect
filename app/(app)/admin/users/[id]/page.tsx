import type { Metadata } from "next";

import AdminUserDetailPage from "./admin-user-detail-page-client";

export const metadata: Metadata = {
  title: "User — CampusConnect",
  description: "View and update user details.",
};

export default function Page() {
  return <AdminUserDetailPage />;
}
