import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadAdminData } from "@/lib/admin-data";
import AdminShell from "@/components/AdminShell";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const { events, dbError, stats } = await loadAdminData();

  return (
    <AdminShell title="Dashboard" subtitle="Overview of your events and activity">
      <Dashboard events={events} dbError={dbError} stats={stats} />
    </AdminShell>
  );
}
