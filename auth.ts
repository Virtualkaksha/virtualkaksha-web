import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { createAuthRuntimeConfig } from "@/auth.config";
import { authorizeCredentials } from "@/lib/auth/credentials-authentication";

const credentialsProvider = Credentials({
  credentials: {
    email: {
      label: "Email",
      type: "email",
    },
    password: {
      label: "Password",
      type: "password",
    },
    expectedRole: {
      label: "Workspace role",
      type: "text",
    },
  },
  async authorize(rawCredentials, request) {
    return authorizeCredentials(rawCredentials, request);
  },
});

export const { auth, handlers, signIn, signOut } = NextAuth(async () => ({
  ...createAuthRuntimeConfig(),
  providers: [credentialsProvider],
}));
