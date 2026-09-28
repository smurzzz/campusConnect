import type { Metadata } from "next";

import AdminLostFoundPage from "./admin-lost-found-page-client";

export const metadata: Metadata = {
  title: "Manage lost & found — CampusConnect",
  description: "Review and manage lost and found reports across campus.",
};

export default function Page() {
  return <AdminLostFoundPage />;
}
