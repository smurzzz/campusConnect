import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Sign up — CampusConnect",
  description: "Create your CampusConnect account.",
};

export default function SignupPage() {
  return <CampusPage page="signup" />;
}
