import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadProjectsData } from "@/lib/admin-data";
import AdminShell from "@/components/AdminShell";
import ProjectsView from "@/components/ProjectsView";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  if (!(await isAuthed())) {
    redirect("/login");
  }

  const { projects, dbError } = await loadProjectsData();

  return (
    <AdminShell title="Projects" subtitle="Manage the portfolio shown on the Brevan Softwares website">
      <ProjectsView initialProjects={projects} dbError={dbError} />
    </AdminShell>
  );
}
