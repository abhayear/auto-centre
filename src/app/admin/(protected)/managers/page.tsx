import { redirect } from "next/navigation";

export default function AdminManagersPage() {
  redirect("/admin/staff?role=manager");
}
