import "server-only";

import type { RoleName, UserStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";

export const currentIdentitySelect = {
  id: true,
  status: true,
  sessionVersion: true,
  roles: {
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

export type CurrentIdentityRecord = {
  id: string;
  status: UserStatus;
  sessionVersion: number;
  roles: Array<{ role: { name: RoleName } }>;
};

export function findCurrentIdentityById(userId: string): Promise<CurrentIdentityRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: currentIdentitySelect,
  });
}
