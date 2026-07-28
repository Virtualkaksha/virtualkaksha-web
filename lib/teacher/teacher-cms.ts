import "server-only";

import { findTeacherWorkspace } from "@/repositories/teacher-cms.repository";

export async function getTeacherCms(userId: string) {
  const data = await findTeacherWorkspace(userId);
  const displayName = data.teacherProfile
    ? data.teacherProfile.user.displayName ??
      [data.teacherProfile.user.firstName, data.teacherProfile.user.lastName]
        .filter(Boolean)
        .join(" ")
    : "Teacher";

  return {
    ...data,
    displayName,
    totals: {
      resources: data.resources.length,
      published: data.resources.filter((item) => item.status === "PUBLISHED").length,
      pending: data.resources.filter((item) => item.status === "PENDING_REVIEW").length,
      drafts: data.resources.filter((item) => item.status === "DRAFT").length,
      views: data.resources.reduce((total, item) => total + item.viewCount, 0),
    },
  };
}
