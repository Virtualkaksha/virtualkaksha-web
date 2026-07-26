import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import {
  findAuthUserByEmail,
  markUserLogin,
} from "@/repositories/auth.repository";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await findAuthUserByEmail(parsed.data.email);

        if (!user || !user.passwordHash || user.status !== "ACTIVE") {
          return null;
        }

        const passwordMatches = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        await markUserLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name:
            user.displayName ??
            [user.firstName, user.lastName].filter(Boolean).join(" "),
          image: user.avatarUrl,
          roles: user.roles.map(({ role }) => role.name),
        };
      },
    }),
  ],
});
