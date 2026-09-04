import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "./auth.config";
import { MANAGER_ROLE, type StaffRole } from "./admin-roles";
import { assertOpsRole } from "./auth-guards";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.adminUser.findUnique({
          where: { email },
        });

        if (!user || !user.active) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role as StaffRole,
        };
      },
    }),
  ],
});

export async function requireStaffSession() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.adminUser.findUnique({
    where: { email: session.user.email },
    select: { active: true, role: true },
  });

  if (!user?.active) {
    return null;
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: user.role as StaffRole,
    },
  };
}

/** Pure guard re-exported for callers that need the helper. */
export { assertOpsRole } from "./auth-guards";

export async function requireOpsPortal() {
  const session = await requireStaffSession();
  if (!session) return null;
  const role = session.user.role;
  if (!assertOpsRole(role)) return null;
  return session;
}

/** Full admin only — for appointing managers and staff management. */
export async function requireAdminRole() {
  const session = await requireStaffSession();
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export function canManageWebsiteContent(role: StaffRole): boolean {
  return role === "admin" || role === MANAGER_ROLE;
}
