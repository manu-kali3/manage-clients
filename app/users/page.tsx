import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadUsersData } from "@/lib/users-data";
import AdminShell from "@/components/AdminShell";
import UsersView from "@/components/UsersView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  if (!(await isAuthed())) redirect("/login");
  const { users, total, dbError } = await loadUsersData();
  return (
    <AdminShell title="Users" subtitle="All accounts with email, name and phone submitted for payments">
      <UsersView initialUsers={users} initialTotal={total} dbError={dbError} />
    </AdminShell>
  );
}
