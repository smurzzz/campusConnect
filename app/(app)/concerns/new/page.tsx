import type { Metadata } from "next";

import NewConcernPage from "./new-concern-page-client";

export const metadata: Metadata = {
  title: "Submit a concern — CampusConnect",
  description: "Tell us what happened and the right team will follow up.",
};

export default function Page() {
  return <NewConcernPage />;
}
