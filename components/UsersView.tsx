"use client";
import { useState, useMemo } from "react";
import type { UserRow } from "@/lib/users-data";

export default function UsersView({ initialUsers, initialTotal, dbError }: { initialUsers: UserRow[]; initialTotal: number; dbError: string }) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return initialUsers;
    const q = filter.toLowerCase();
    return initialUsers.filter((u) => [u.email, u.name ?? "", u.phone ?? "", u.paymentPhone ?? "", u.location ?? "", u.org_type ?? "", u.gender ?? "", u.secondary_phone ?? "", u.secondary_email ?? "", u.next_of_kin_name ?? ""].join(" ").toLowerCase().includes(q));
  }, [initialUsers, filter]);

  function openEdit(u: UserRow) {
    setEditing(u);
    setMsg("");
    setForm({
      full_name: u.name ?? "",
      phone: u.phone ?? "",
      dob: u.dob ? u.dob.slice(0, 10) : "",
      org_type: u.org_type ?? "",
      gender: u.gender ?? "",
      location: u.location ?? "",
      referral_source: u.referral_source ?? "",
      secondary_phone: u.secondary_phone ?? "",
      secondary_email: u.secondary_email ?? "",
      next_of_kin_name: u.next_of_kin_name ?? "",
      next_of_kin_phone: u.next_of_kin_phone ?? "",
      next_of_kin_relationship: u.next_of_kin_relationship ?? "",
    });
  }

  async function submit() {
    if (!editing) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/clients/update-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: editing.id, fields: form }) });
      const d = await res.json();
      if (!res.ok) setMsg(d.error ?? "Failed");
      else { setToast("Profile updated"); setEditing(null); setTimeout(() => location.reload(), 700); }
    } catch { setMsg("Network error"); }
    setBusy(false);
  }

  return (
    <>
      {dbError && <div className="banner error">Database: {dbError}</div>}
      {toast && <div className="toast ok">{toast}</div>}
      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon green">👥</div><div><div className="stat-value">{initialTotal}</div><div className="stat-label">Total users</div></div></div>
        <div className="stat-card"><div className="stat-icon navy">✓</div><div><div className="stat-value">{initialUsers.filter((u) => u.email_confirmed).length}</div><div className="stat-label">Confirmed emails</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">📱</div><div><div className="stat-value">{initialUsers.filter((u) => u.phone || u.paymentPhone).length}</div><div className="stat-label">With phone</div></div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 12, flexWrap: "wrap" }}>
          <h2>Users</h2>
          <span className="count-pill">{filtered.length} shown</span>
          <span className="muted small">Tap a row to see extended profile</span>
          <input placeholder="Search name, email, phone..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginLeft: "auto", minWidth: 220, padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14 }} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>DOB / Gender</th><th>Location / Org</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--color-muted)" }}>No users found.</td></tr>
              ) : filtered.map((u) => (
                <>
                  <tr key={u.id} className="clickable-row" onClick={() => setExpanded(expanded === u.id ? null : u.id)} style={{ cursor: "pointer" }}>
                    <td><div className="cell-primary">{u.name ?? "—"}</div><div className="cell-sub">{u.provider} · {u.email_confirmed ? "confirmed" : "pending"}</div></td>
                    <td>{u.email}<div className="cell-sub">{u.secondary_email ?? ""}</div></td>
                    <td>{u.phone ?? "—"}<div className="cell-sub">{u.secondary_phone ?? u.paymentPhone ?? ""}</div></td>
                    <td>{u.dob ? new Date(u.dob).toLocaleDateString() : "—"}<div className="cell-sub">{u.gender ?? "—"}</div></td>
                    <td>{u.location ?? "—"}<div className="cell-sub">{u.org_type ?? "—"} · {u.referral_source ?? "—"}</div></td>
                    <td><button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>Edit</button></td>
                  </tr>
                  {expanded === u.id && (
                    <tr key={u.id + "-exp"}>
                      <td colSpan={6} style={{ background: "#fafbfc", padding: "14px 18px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, fontSize: 13 }}>
                          <div><strong>DOB:</strong> {u.dob ? new Date(u.dob).toLocaleDateString() : "—"}</div>
                          <div><strong>Gender:</strong> {u.gender ?? "—"}</div>
                          <div><strong>Org type:</strong> {u.org_type ?? "—"}</div>
                          <div><strong>Location:</strong> {u.location ?? "—"}</div>
                          <div><strong>Referral:</strong> {u.referral_source ?? "—"}</div>
                          <div><strong>Secondary phone:</strong> {u.secondary_phone ?? "—"}</div>
                          <div><strong>Secondary email:</strong> {u.secondary_email ?? "—"}</div>
                          <div><strong>Next of kin:</strong> {u.next_of_kin_name ?? "—"} {u.next_of_kin_phone ? `(${u.next_of_kin_phone})` : ""}</div>
                          <div><strong>Relationship:</strong> {u.next_of_kin_relationship ?? "—"}</div>
                          <div><strong>Payment phone:</strong> {u.paymentPhone ?? "—"}</div>
                          <div><strong>Created:</strong> {new Date(u.created_at).toLocaleDateString()}</div>
                          <div><strong>Last sign in:</strong> {u.last_sign_in ? new Date(u.last_sign_in).toLocaleString() : "—"}</div>
                        </div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                          <a className="btn ghost sm" href={`/clients`}>View in Clients</a>
                          <button className="btn sm" onClick={() => openEdit(u)}>Edit profile</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-foot muted">Total number of users in your system: {initialTotal}</div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h2>Edit profile</h2><button className="modal-close" onClick={() => setEditing(null)}>✕</button></div>
            <div className="modal-body" style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--color-muted)" }}>{editing.email}</div>
              <div className="field-row"><div className="field"><label>Full name</label><input value={form.full_name} onChange={(e) => setForm((m) => ({ ...m, full_name: e.target.value }))} /></div><div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((m) => ({ ...m, phone: e.target.value }))} /></div></div>
              <div className="field-row"><div className="field"><label>DOB</label><input type="date" value={form.dob} onChange={(e) => setForm((m) => ({ ...m, dob: e.target.value }))} /></div><div className="field"><label>Gender</label><select value={form.gender} onChange={(e) => setForm((m) => ({ ...m, gender: e.target.value }))}><option value="">—</option><option value="male">male</option><option value="female">female</option><option value="other">other</option><option value="prefer_not_to_say">prefer_not_to_say</option></select></div></div>
              <div className="field-row"><div className="field"><label>Org type</label><input value={form.org_type} onChange={(e) => setForm((m) => ({ ...m, org_type: e.target.value }))} /></div><div className="field"><label>Location</label><input value={form.location} onChange={(e) => setForm((m) => ({ ...m, location: e.target.value }))} /></div></div>
              <div className="field-row"><div className="field"><label>Secondary phone</label><input value={form.secondary_phone} onChange={(e) => setForm((m) => ({ ...m, secondary_phone: e.target.value }))} /></div><div className="field"><label>Secondary email</label><input type="email" value={form.secondary_email} onChange={(e) => setForm((m) => ({ ...m, secondary_email: e.target.value }))} /></div></div>
              <div className="field"><label>Referral source</label><input value={form.referral_source} onChange={(e) => setForm((m) => ({ ...m, referral_source: e.target.value }))} /></div>
              <div className="field-row"><div className="field"><label>Next of kin name</label><input value={form.next_of_kin_name} onChange={(e) => setForm((m) => ({ ...m, next_of_kin_name: e.target.value }))} /></div><div className="field"><label>Next of kin phone</label><input value={form.next_of_kin_phone} onChange={(e) => setForm((m) => ({ ...m, next_of_kin_phone: e.target.value }))} /></div></div>
              <div className="field"><label>Relationship</label><input value={form.next_of_kin_relationship} onChange={(e) => setForm((m) => ({ ...m, next_of_kin_relationship: e.target.value }))} /></div>
              {msg && <div className="msg err">{msg}</div>}
            </div>
            <div className="modal-footer"><button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn" disabled={busy} onClick={submit}>{busy ? "Saving..." : "Save"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
