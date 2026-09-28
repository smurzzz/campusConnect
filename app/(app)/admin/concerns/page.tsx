import type { Metadata } from "next";

import AdminConcernsPage from "./admin-concerns-page-client";

export const metadata: Metadata = {
  title: "Manage concerns — CampusConnect",
  description: "Review and manage concerns across campus.",
};

export default function Page() {
  return <AdminConcernsPage />;
}
