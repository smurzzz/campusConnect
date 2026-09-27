import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Log in — CampusConnect",
  description: "Log in to your CampusConnect account.",
};

export default function LoginPage() {
  return <CampusPage page="login" />;
}
