import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import ScanView from "@/components/ScanView";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  return (
    <AdminShell title="Ticket scanner" subtitle="Verify tickets against the database at the door">
      <ScanView />
    </AdminShell>
  );
}
