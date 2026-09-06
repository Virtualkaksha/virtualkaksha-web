import { auth } from "@/auth";
import NavbarClient from "./NavbarClient";
import { getRoleHome } from "@/lib/auth/role-routing";

/**
 * Session state here is a navigation hint only. It uses the JWT rather than a fresh
 * database identity so public pages do not pay a query, and it grants no access.
 */
export default async function Navbar() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <NavbarClient
      isAuthenticated={isAuthenticated}
      workspacePath={getRoleHome(session?.user?.roles ?? [])}
    />
  );
}
