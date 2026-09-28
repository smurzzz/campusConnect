import type { Metadata } from "next";

import LostFoundPage from "./lost-found-page-client";

export const metadata: Metadata = {
  title: "Lost & Found — CampusConnect",
  description: "Browse recent reports or help return an item.",
};

export default function Page() {
  return <LostFoundPage />;
}
