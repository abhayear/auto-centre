import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DevDbBanner } from "@/components/layout/DevDbBanner";
import { requireStaffSession } from "@/lib/auth";
import { assertStaffPageAccess } from "@/lib/portal-pages";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();
  if (!session) {
    redirect("/admin/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "/admin";
  const accessRedirect = assertStaffPageAccess(pathname, session.user.role);
  if (accessRedirect) {
    redirect(accessRedirect);
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DevDbBanner />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
