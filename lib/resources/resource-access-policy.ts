import type { Prisma } from "@/app/generated/prisma/client";

export const STUDENT_RESOURCE_ACCESS = "FREE" as const;

export const STUDENT_READABLE_RESOURCE_WHERE = {
  status: "PUBLISHED",
  access: STUDENT_RESOURCE_ACCESS,
  resourceType: { is: { isActive: true } },
  OR: [
    {
      chapter: {
        is: {
          isActive: true,
          boardClassSubject: {
            is: {
              isActive: true,
              board: { is: { isActive: true } },
              classLevel: { is: { isActive: true } },
              subject: { is: { isActive: true } },
            },
          },
        },
      },
    },
    {
      examTopic: {
        is: {
          isActive: true,
          examSubject: {
            is: {
              isActive: true,
              exam: { is: { isActive: true } },
              subject: { is: { isActive: true } },
            },
          },
        },
      },
    },
  ],
} satisfies Prisma.ResourceWhereInput;

export function studentReadableResourceWhere(
  additional: Prisma.ResourceWhereInput = {},
): Prisma.ResourceWhereInput {
  return { AND: [STUDENT_READABLE_RESOURCE_WHERE, additional] };
}
