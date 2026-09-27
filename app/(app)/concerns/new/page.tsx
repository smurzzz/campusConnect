import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Submit a concern — CampusConnect",
  description: "Tell us what happened and the right team will follow up.",
};

export default function NewConcernPage() {
  return <CampusPage page="concern-new" />;
}
