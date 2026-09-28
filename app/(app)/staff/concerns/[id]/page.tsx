import type { Metadata } from "next";

import StaffConcernDetailPage from "./staff-concern-detail-page-client";

export const metadata: Metadata = {
  title: "Concern — CampusConnect",
  description: "Reply to the student and update the status.",
};

export default function Page() {
  return <StaffConcernDetailPage />;
}
