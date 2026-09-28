import type { Metadata } from "next";

import StaffConcernsPage from "./staff-concerns-page-client";

export const metadata: Metadata = {
  title: "All concerns — CampusConnect",
  description: "Review, update, and respond to student concerns.",
};

export default function Page() {
  return <StaffConcernsPage />;
}
