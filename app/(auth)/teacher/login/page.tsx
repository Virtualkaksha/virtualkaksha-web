import type { Metadata } from "next";
import RoleLoginPage from "@/app/components/auth/RoleLoginPage";
export const metadata: Metadata = { title: "Teacher Login", description: "Sign in to the VirtualKaksha teacher workspace." };
export default function TeacherLoginPage() { return <RoleLoginPage role="TEACHER" />; }
