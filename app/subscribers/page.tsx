import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadSubscribersData, loadCampaignsData } from "@/lib/booking-data";
import AdminShell from "@/components/AdminShell";
import SubscribersView from "@/components/SubscribersView";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const [{ subscribers, dbError }, { campaigns }] = await Promise.all([
    loadSubscribersData(),
    loadCampaignsData(),
  ]);

  return (
    <AdminShell title="Subscribers" subtitle="Email list and bulk broadcasts">
      <SubscribersView initialSubscribers={subscribers} initialCampaigns={campaigns} dbError={dbError} />
    </AdminShell>
  );
}
