import type { DefaultSession } from "next-auth";
import type { RoleName } from "@/app/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    roles: RoleName[];
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      roles: RoleName[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    roles: RoleName[];
  }
}
