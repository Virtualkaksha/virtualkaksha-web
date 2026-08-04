import type { Metadata } from "next";
import RoleLoginPage from "@/app/components/auth/RoleLoginPage";

export const metadata: Metadata = { title: "Student Login", description: "Sign in to the VirtualKaksha student workspace." };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ signup?: string }> }) {
  const notice = await searchParams;
  return <RoleLoginPage role="STUDENT" signupNotice={notice.signup === "received"} />;
}
