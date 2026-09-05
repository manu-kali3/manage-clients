import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadAdminData } from "@/lib/admin-data";
import AdminShell from "@/components/AdminShell";
import EventsView from "@/components/EventsView";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const { events, dbError } = await loadAdminData();

  return (
    <AdminShell title="Events" subtitle="Manage the events shown on the Brevan Softwares website">
      <EventsView initialEvents={events} dbError={dbError} />
    </AdminShell>
  );
}
