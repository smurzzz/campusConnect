import type { Metadata } from "next";

import ConcernDetailPage from "./concern-detail-page-client";

export const metadata: Metadata = {
  title: "Concern — CampusConnect",
  description: "Follow the conversation on your concern.",
};

export default function Page() {
  return <ConcernDetailPage />;
}
