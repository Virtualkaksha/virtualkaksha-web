import Link from "next/link";

import { requireAnyCurrentRole } from "@/lib/auth/current-identity";
import { findTeacherWorkspaceMetadata } from "@/repositories/teacher-cms.repository";
import { createTeacherResource } from "../actions";
import ResourceCreateForm from "../ResourceCreateForm";

export default async function NewTeacherResourcePage() {
  const user = await requireAnyCurrentRole(["TEACHER", "ADMIN"]);
  const metadata = await findTeacherWorkspaceMetadata(user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/teacher/resources" className="text-sm font-semibold text-blue-700">← My Resources</Link>
      <header className="mt-5"><p className="text-sm font-semibold text-blue-700">Teacher CMS</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Add resource</h1><p className="mt-2 text-sm text-slate-600">Create a draft or submit a new resource for moderation.</p></header>
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ResourceCreateForm chapters={metadata.chapters} resourceTypes={metadata.resourceTypes} canPublish={user.roles.includes("ADMIN")} action={createTeacherResource}/>
      </section>
    </main>
  );
}
