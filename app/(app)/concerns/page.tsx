import type { Metadata } from "next";

import ConcernsPage from "./concerns-page-client";

export const metadata: Metadata = {
  title: "My concerns — CampusConnect",
  description: "Track every request from submission to resolution.",
};

export default function Page() {
  return <ConcernsPage />;
}
