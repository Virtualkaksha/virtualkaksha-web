import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import type { RoleName, UserStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";

export type AccountSecurityMutationResult =
  | { outcome: "changed"; sessionVersion: number }
  | { outcome: "noop"; sessionVersion: number }
  | { outcome: "not-found" }
  | { outcome: "last-admin" };

type TransactionClient = Prisma.TransactionClient;
type AccountSecurityClient = Pick<PrismaClient, "$transaction">;

const transactionOptions = {
  isolationLevel: "Serializable" as const,
  maxWait: 5_000,
  timeout: 10_000,
};

async function isLastActiveAdmin(tx: TransactionClient, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      roles: { where: { role: { name: "ADMIN" } }, select: { id: true } },
    },
  });
  if (!user || user.status !== "ACTIVE" || user.roles.length === 0) return false;
  const activeAdmins = await tx.user.count({
    where: { status: "ACTIVE", roles: { some: { role: { name: "ADMIN" } } } },
  });
  return activeAdmins <= 1;
}

export function createAccountSecurityRepository(client: AccountSecurityClient = prisma) {
  return Object.freeze({
    async changeRole(targetUserId: string, roleName: RoleName, operation: "add" | "remove") {
      return client.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { sessionVersion: true },
        });
        if (!user) return { outcome: "not-found" } as const;
        const role = await tx.role.findUnique({ where: { name: roleName }, select: { id: true } });
        if (!role) return { outcome: "not-found" } as const;

        if (operation === "add") {
          const created = await tx.userRole.createMany({
            data: [{ userId: targetUserId, roleId: role.id }],
            skipDuplicates: true,
          });
          if (created.count === 0) return { outcome: "noop", sessionVersion: user.sessionVersion } as const;
        } else {
          const existing = await tx.userRole.findUnique({
            where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
            select: { id: true },
          });
          if (!existing) return { outcome: "noop", sessionVersion: user.sessionVersion } as const;
          if (roleName === "ADMIN" && await isLastActiveAdmin(tx, targetUserId)) {
            return { outcome: "last-admin" } as const;
          }
          await tx.userRole.delete({ where: { id: existing.id } });
        }

        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { sessionVersion: { increment: 1 } },
          select: { sessionVersion: true },
        });
        return { outcome: "changed", sessionVersion: updated.sessionVersion } as const;
      }, transactionOptions);
    },

    async replaceRoles(targetUserId: string, roleNames: readonly RoleName[]) {
      return client.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: targetUserId },
          select: {
            sessionVersion: true,
            status: true,
            roles: { select: { role: { select: { id: true, name: true } } } },
          },
        });
        if (!user) return { outcome: "not-found" } as const;
        const roles = await tx.role.findMany({ where: { name: { in: [...roleNames] } }, select: { id: true, name: true } });
        if (roles.length !== roleNames.length) return { outcome: "not-found" } as const;
        const current = new Set(user.roles.map(({ role }) => role.name));
        const requested = new Set(roleNames);
        if (current.size === requested.size && [...current].every((role) => requested.has(role))) {
          return { outcome: "noop", sessionVersion: user.sessionVersion } as const;
        }
        if (current.has("ADMIN") && !requested.has("ADMIN") && await isLastActiveAdmin(tx, targetUserId)) {
          return { outcome: "last-admin" } as const;
        }
        await tx.userRole.deleteMany({ where: { userId: targetUserId } });
        if (roles.length) {
          await tx.userRole.createMany({ data: roles.map((role) => ({ userId: targetUserId, roleId: role.id })) });
        }
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { sessionVersion: { increment: 1 } },
          select: { sessionVersion: true },
        });
        return { outcome: "changed", sessionVersion: updated.sessionVersion } as const;
      }, transactionOptions);
    },

    async changeStatus(targetUserId: string, status: UserStatus) {
      return client.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { status: true, sessionVersion: true },
        });
        if (!user) return { outcome: "not-found" } as const;
        if (user.status === status) return { outcome: "noop", sessionVersion: user.sessionVersion } as const;
        if (status !== "ACTIVE" && await isLastActiveAdmin(tx, targetUserId)) {
          return { outcome: "last-admin" } as const;
        }
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { status, sessionVersion: { increment: 1 } },
          select: { sessionVersion: true },
        });
        return { outcome: "changed", sessionVersion: updated.sessionVersion } as const;
      }, transactionOptions);
    },

    async changePasswordHash(targetUserId: string, passwordHash: string) {
      return client.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: targetUserId }, select: { passwordHash: true, sessionVersion: true } });
        if (!user) return { outcome: "not-found" } as const;
        if (user.passwordHash === passwordHash) return { outcome: "noop", sessionVersion: user.sessionVersion } as const;
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { passwordHash, sessionVersion: { increment: 1 } },
          select: { sessionVersion: true },
        });
        return { outcome: "changed", sessionVersion: updated.sessionVersion } as const;
      }, transactionOptions);
    },

    async incrementSessionVersion(targetUserId: string, requireActive = false) {
      return client.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: targetUserId, ...(requireActive ? { status: "ACTIVE" as const } : {}) },
          data: { sessionVersion: { increment: 1 } },
        });
        if (updated.count === 0) return { outcome: "not-found" } as const;
        const user = await tx.user.findUniqueOrThrow({ where: { id: targetUserId }, select: { sessionVersion: true } });
        return { outcome: "changed", sessionVersion: user.sessionVersion } as const;
      }, transactionOptions);
    },
  });
}

export const accountSecurityRepository = createAccountSecurityRepository();
export type AccountSecurityRepository = typeof accountSecurityRepository;
