import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadClientsData } from "@/lib/clients-data";
import AdminShell from "@/components/AdminShell";
import ClientsView from "@/components/ClientsView";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  if (!(await isAuthed())) redirect("/login");
  const { clients, total, dbError } = await loadClientsData();
  return (
    <AdminShell title="Clients" subtitle="All client profiles with bookings and message threads — reply as admin">
      <ClientsView initialClients={clients} initialTotal={total} dbError={dbError} />
    </AdminShell>
  );
}
