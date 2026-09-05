import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadSettingsData } from "@/lib/admin-data";
import AdminShell from "@/components/AdminShell";
import SettingsView from "@/components/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const { settings, dbError } = await loadSettingsData();

  return (
    <AdminShell title="Site Images" subtitle="Change the images shown across the Brevan Softwares website">
      <SettingsView initialSettings={settings} dbError={dbError} />
    </AdminShell>
  );
}
