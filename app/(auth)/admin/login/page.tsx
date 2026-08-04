import type { Metadata } from "next";
import RoleLoginPage from "@/app/components/auth/RoleLoginPage";
export const metadata: Metadata = { title: "Admin Login", description: "Sign in to the VirtualKaksha administration workspace." };
export default function AdminLoginPage() { return <RoleLoginPage role="ADMIN" />; }
