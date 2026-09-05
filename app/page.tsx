import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadClientsData } from "@/lib/clients-data";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await isAuthed())) redirect("/login");
  const { clients, total, dbError } = await loadClientsData();
  const totalBookings = clients.reduce((n, c) => n + c.bookings.length, 0);
  const pending = clients.reduce((n, c) => n + c.bookings.filter((b) => b.status === "pending").length, 0);

  return (
    <AdminShell title="Dashboard" subtitle="Overview of clients and deals">
      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon green">C</div><div><div className="stat-value">{clients.filter((c) => c.bookings.length > 0).length}</div><div className="stat-label">Clients with deals</div></div></div>
        <div className="stat-card"><div className="stat-icon navy">B</div><div><div className="stat-value">{totalBookings}</div><div className="stat-label">Total bookings</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">P</div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending</div></div></div>
        <div className="stat-card"><div className="stat-icon navy">U</div><div><div className="stat-value">{total}</div><div className="stat-label">Total users</div></div></div>
      </div>
      {dbError && <div className="banner error">Database: {dbError}</div>}
      <div className="card">
        <div className="card-header"><h2>Recent clients</h2><a className="btn ghost sm" href="/clients">View all</a></div>
        {clients.slice(0, 5).map((c) => (
          <div key={c.id} style={{ padding: "12px 22px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 600 }}>{c.name ?? c.email}</div><div style={{ fontSize: 12, color: "var(--color-muted)" }}>{c.email} · {c.bookings.length} bookings</div></div>
            <span className="badge status-paid">{c.bookings.length} deals</span>
          </div>
        ))}
        {clients.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--color-muted)" }}>No clients yet.</div>}
      </div>
    </AdminShell>
  );
}
