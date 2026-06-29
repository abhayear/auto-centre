import type { NextAuthConfig } from "next-auth";
import type { StaffRole } from "@/lib/admin-roles";

export default {
  providers: [],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as StaffRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
