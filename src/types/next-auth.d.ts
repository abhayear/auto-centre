import "next-auth";
import "next-auth/jwt";
import type { StaffRole } from "@/lib/admin-roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: StaffRole;
    };
  }

  interface User {
    id: string;
    email: string;
    role: StaffRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: StaffRole;
  }
}
