import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import SecurityView from "@/components/SecurityView";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  return (
    <AdminShell
      title="Security"
      subtitle="Change the password used to sign in to this dashboard"
    >
      <SecurityView />
    </AdminShell>
  );
}
