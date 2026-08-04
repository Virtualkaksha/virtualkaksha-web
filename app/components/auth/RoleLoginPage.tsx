import LoginForm from "./LoginForm";
import type { LoginRole } from "@/lib/auth/role-routing";

const content = {
  STUDENT: { eyebrow: "Student workspace", title: "Student Login", description: "Continue reading learning resources, manage bookmarks, and resume saved PDF progress." },
  TEACHER: { eyebrow: "Teacher workspace", title: "Teacher Login", description: "Upload learning resources and manage submissions through the teacher workspace." },
  ADMIN: { eyebrow: "Administration workspace", title: "Admin Login", description: "Review moderation queues and access authorised administration tools." },
} as const;

export default function RoleLoginPage({ role, signupNotice = false }: { role: LoginRole; signupNotice?: boolean }) {
  const copy = content[role];
  return <div className="mx-auto max-w-md">
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">{copy.eyebrow}</p>
    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{copy.title}</h2>
    <p className="mt-3 text-sm leading-6 text-slate-600">{copy.description}</p>
    {signupNotice ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">If registration could be completed, you can now sign in.</p> : null}
    <LoginForm expectedRole={role} />
  </div>;
}
