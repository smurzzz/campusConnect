import type { Metadata } from "next";

import { CampusPage } from "@/components/campus-page";

export const metadata: Metadata = {
  title: "Forgot password — CampusConnect",
  description: "Reset your CampusConnect password.",
};

export default function ForgotPasswordPage() {
  return <CampusPage page="forgot" />;
}
