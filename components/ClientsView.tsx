"use client";
import { useState, useMemo } from "react";
import type { ClientRow, ServiceBookingRow } from "@/lib/clients-data";

const STATUSES = ["pending", "in_progress", "review", "completed", "cancelled"] as const;

export default function ClientsView({ initialClients, initialTotal, dbError }: { initialClients: ClientRow[]; initialTotal: number; dbError: string }) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);
  const [bookingEdits, setBookingEdits] = useState<Record<string, { status: string; amount: string; project_url: string }>>({});
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return initialClients.filter((c) => {
      if (statusFilter !== "all") {
        if (!c.bookings.some((b) => b.status === statusFilter)) return false;
      }
      if (!q) return true;
      const hay = [c.email, c.name ?? "", c.phone ?? "", c.paymentPhone ?? "", c.location ?? "", c.org_type ?? "", c.gender ?? "", c.referral_source ?? "", c.secondary_phone ?? "", c.secondary_email ?? "", c.next_of_kin_name ?? "", c.bookings.map((b) => b.service).join(" ")].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [initialClients, filter, statusFilter]);

  function openEdit(c: ClientRow) {
    setEditing(c);
    setEditMsg("");
    setEditForm({
      full_name: c.name ?? "",
      phone: c.phone ?? "",
      dob: c.dob ? c.dob.slice(0, 10) : "",
      org_type: c.org_type ?? "",
      gender: c.gender ?? "",
      location: c.location ?? "",
      referral_source: c.referral_source ?? "",
      secondary_phone: c.secondary_phone ?? "",
      secondary_email: c.secondary_email ?? "",
      next_of_kin_name: c.next_of_kin_name ?? "",
      next_of_kin_phone: c.next_of_kin_phone ?? "",
      next_of_kin_relationship: c.next_of_kin_relationship ?? "",
    });
  }

  async function submitEdit() {
    if (!editing) return;
    setEditBusy(true);
    setEditMsg("");
    try {
      const res = await fetch("/api/clients/update-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: editing.id, fields: editForm }) });
      const d = await res.json();
      if (!res.ok) setEditMsg(d.error ?? "Failed");
      else { setToast("Profile updated"); setEditing(null); setTimeout(() => location.reload(), 800); }
    } catch { setEditMsg("Network error"); }
    setEditBusy(false);
  }

  async function sendReply(booking: ServiceBookingRow) {
    const body = (replyText[booking.id] ?? "").trim();
    if (!body) return;
    setReplyBusy(booking.id);
    try {
      const res = await fetch("/api/clients/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: booking.id, body }) });
      const d = await res.json();
      if (!res.ok) setToast(d.error ?? "Reply failed");
      else { setToast("Reply sent"); setReplyText((m) => ({ ...m, [booking.id]: "" })); setTimeout(() => location.reload(), 700); }
    } catch { setToast("Network error"); }
    setReplyBusy(null);
  }

  async function saveBooking(booking: ServiceBookingRow) {
    const e = bookingEdits[booking.id];
    if (!e) return;
    setReplyBusy(booking.id);
    try {
      const res = await fetch("/api/clients/update-booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: booking.id, status: e.status, amount: e.amount, project_url: e.project_url }) });
      const d = await res.json();
      if (!res.ok) setToast(d.error ?? "Update failed");
      else { setToast("Booking updated"); setTimeout(() => location.reload(), 700); }
    } catch { setToast("Network error"); }
    setReplyBusy(null);
  }

  function initBookingEdit(b: ServiceBookingRow) {
    if (bookingEdits[b.id]) return;
    setBookingEdits((m) => ({ ...m, [b.id]: { status: b.status, amount: b.amount != null ? String(b.amount) : "", project_url: b.project_url ?? "" } }));
  }

  return (
    <>
      {dbError && <div className="banner error">Database: {dbError}</div>}
      {toast && <div className="toast ok">{toast}</div>}
      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon green">👥</div><div><div className="stat-value">{initialTotal}</div><div className="stat-label">Total clients</div></div></div>
        <div className="stat-card"><div className="stat-icon navy">📋</div><div><div className="stat-value">{initialClients.reduce((n, c) => n + c.bookings.length, 0)}</div><div className="stat-label">Bookings</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">💬</div><div><div className="stat-value">{initialClients.reduce((n, c) => n + c.bookings.reduce((a, b) => a + b.comments.length, 0), 0)}</div><div className="stat-label">Comments</div></div></div>
        <div className="stat-card"><div className="stat-icon navy">⏳</div><div><div className="stat-value">{initialClients.reduce((n, c) => n + c.bookings.filter((b) => b.status === "pending").length, 0)}</div><div className="stat-label">Pending</div></div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ gap: 12, flexWrap: "wrap" }}>
          <h2>Clients</h2>
          <span className="count-pill">{filtered.length} shown</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...STATUSES].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`filter-tab ${statusFilter === s ? "active" : ""}`} style={{ textTransform: "capitalize" }}>{s}</button>
            ))}
          </div>
          <input placeholder="Search name, email, phone, service..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginLeft: "auto", minWidth: 220, padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14 }} />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--color-muted)" }}>No clients found.</div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} style={{ borderBottom: "1px solid var(--color-border)", padding: "16px 22px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name ?? "—"} <span style={{ fontWeight: 400, color: "var(--color-muted)", fontSize: 13 }}>{c.email}</span></div>
                  <div style={{ fontSize: 12.5, color: "var(--color-muted)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>📱 {c.phone ?? "—"} {c.secondary_phone ? `/ ${c.secondary_phone}` : ""}</span>
                    <span>✉️ {c.secondary_email ?? "—"}</span>
                    <span>📍 {c.location ?? "—"}</span>
                    <span>🏢 {c.org_type ?? "—"}</span>
                    <span>⚧ {c.gender ?? "—"}</span>
                    <span>🎂 {c.dob ? new Date(c.dob).toLocaleDateString() : "—"}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-muted)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>Referral: {c.referral_source ?? "—"}</span>
                    <span>NOK: {c.next_of_kin_name ?? "—"} {c.next_of_kin_phone ? `(${c.next_of_kin_phone})` : ""} {c.next_of_kin_relationship ? `[${c.next_of_kin_relationship}]` : ""}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>{c.paymentPhone ? `Payment phone: ${c.paymentPhone}` : ""} {c.provider ? `· ${c.provider}` : ""} {c.email_confirmed ? "· confirmed" : "· pending"} · {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost sm" onClick={() => openEdit(c)}>Edit profile</button>
                  <button className="btn sm" style={{ background: expanded === c.id ? "var(--color-navy)" : undefined }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>{expanded === c.id ? "Collapse" : `Bookings (${c.bookings.length})`}</button>
                </div>
              </div>

              {expanded === c.id && (
                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {c.bookings.length === 0 ? (
                    <div style={{ padding: 12, background: "#fafbfc", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-muted)", fontSize: 13 }}>No bookings.</div>
                  ) : c.bookings.map((b) => {
                    const ed = bookingEdits[b.id];
                    return (
                      <div key={b.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                        <div style={{ padding: "12px 14px", background: "#fafbfc", borderBottom: "1px solid var(--color-border)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{b.service}</div>
                            <div style={{ fontSize: 12.5, color: "var(--color-muted)" }}>{b.description ?? "No description"} · {new Date(b.created_at).toLocaleString()} {b.amount != null ? `· KES ${Number(b.amount).toLocaleString()}` : ""} {b.project_url ? `· ` : ""}{b.project_url ? <a href={b.project_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Project</a> : null}</div>
                          </div>
                          <span className={`badge status-${b.status === "completed" ? "paid" : b.status === "pending" ? "pending" : b.status === "cancelled" ? "cancelled" : "free"}`} style={{ textTransform: "capitalize" }}>{b.status.replace("_", " ")}</span>
                        </div>

                        <div style={{ padding: 14 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                            {!ed ? <button className="btn ghost sm" onClick={() => initBookingEdit(b)}>Edit booking</button> : (
                              <>
                                <select value={ed.status} onChange={(e) => setBookingEdits((m) => ({ ...m, [b.id]: { ...ed, status: e.target.value } }))} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13 }}>
                                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <input placeholder="Amount" value={ed.amount} onChange={(e) => setBookingEdits((m) => ({ ...m, [b.id]: { ...ed, amount: e.target.value } }))} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13, width: 110 }} />
                                <input placeholder="Project URL" value={ed.project_url} onChange={(e) => setBookingEdits((m) => ({ ...m, [b.id]: { ...ed, project_url: e.target.value } }))} style={{ padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13, flex: "1 1 160px" }} />
                                <button className="btn sm" disabled={replyBusy === b.id} onClick={() => saveBooking(b)}>Save</button>
                                <button className="btn ghost sm" onClick={() => setBookingEdits((m) => { const n = { ...m }; delete n[b.id]; return n; })}>Cancel</button>
                              </>
                            )}
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Thread ({b.comments.length})</div>
                          <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
                            {b.comments.length === 0 ? <div style={{ color: "var(--color-muted)", fontSize: 13 }}>No messages yet.</div> : b.comments.map((cm) => (
                              <div key={cm.id} style={{ display: "flex", justifyContent: cm.is_admin ? "flex-end" : "flex-start" }}>
                                <div style={{ maxWidth: "78%", padding: "8px 12px", borderRadius: 10, fontSize: 13, background: cm.is_admin ? "var(--color-navy)" : "#eef0f4", color: cm.is_admin ? "#fff" : "var(--color-text)" }}>
                                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>{cm.is_admin ? "Admin" : "Client"} · {new Date(cm.created_at).toLocaleString()}</div>
                                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{cm.body}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <input placeholder="Reply as admin..." value={replyText[b.id] ?? ""} onChange={(e) => setReplyText((m) => ({ ...m, [b.id]: e.target.value }))} style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14 }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(b); } }} />
                            <button className="btn sm" disabled={replyBusy === b.id || !(replyText[b.id] ?? "").trim()} onClick={() => sendReply(b)}>{replyBusy === b.id ? "Sending..." : "Reply"}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
        <div className="card-foot muted">Total clients: {initialTotal}</div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h2>Edit client profile</h2><button className="modal-close" onClick={() => setEditing(null)}>✕</button></div>
            <div className="modal-body" style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--color-muted)" }}>{editing.email}</div>
              <div className="field-row">
                <div className="field"><label>Full name</label><input value={editForm.full_name} onChange={(e) => setEditForm((m) => ({ ...m, full_name: e.target.value }))} /></div>
                <div className="field"><label>Phone</label><input value={editForm.phone} onChange={(e) => setEditForm((m) => ({ ...m, phone: e.target.value }))} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>DOB</label><input type="date" value={editForm.dob} onChange={(e) => setEditForm((m) => ({ ...m, dob: e.target.value }))} /></div>
                <div className="field"><label>Gender</label><select value={editForm.gender} onChange={(e) => setEditForm((m) => ({ ...m, gender: e.target.value }))}><option value="">—</option><option value="male">male</option><option value="female">female</option><option value="other">other</option><option value="prefer_not_to_say">prefer_not_to_say</option></select></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Organization type</label><input value={editForm.org_type} onChange={(e) => setEditForm((m) => ({ ...m, org_type: e.target.value }))} placeholder="individual / company / NGO" /></div>
                <div className="field"><label>Location</label><input value={editForm.location} onChange={(e) => setEditForm((m) => ({ ...m, location: e.target.value }))} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Secondary phone</label><input value={editForm.secondary_phone} onChange={(e) => setEditForm((m) => ({ ...m, secondary_phone: e.target.value }))} /></div>
                <div className="field"><label>Secondary email</label><input type="email" value={editForm.secondary_email} onChange={(e) => setEditForm((m) => ({ ...m, secondary_email: e.target.value }))} /></div>
              </div>
              <div className="field"><label>Referral source</label><input value={editForm.referral_source} onChange={(e) => setEditForm((m) => ({ ...m, referral_source: e.target.value }))} placeholder="google, referral, social..." /></div>
              <div className="field-row">
                <div className="field"><label>Next of kin name</label><input value={editForm.next_of_kin_name} onChange={(e) => setEditForm((m) => ({ ...m, next_of_kin_name: e.target.value }))} /></div>
                <div className="field"><label>Next of kin phone</label><input value={editForm.next_of_kin_phone} onChange={(e) => setEditForm((m) => ({ ...m, next_of_kin_phone: e.target.value }))} /></div>
              </div>
              <div className="field"><label>Next of kin relationship</label><input value={editForm.next_of_kin_relationship} onChange={(e) => setEditForm((m) => ({ ...m, next_of_kin_relationship: e.target.value }))} /></div>
              {editMsg && <div className="msg err">{editMsg}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" disabled={editBusy} onClick={submitEdit}>{editBusy ? "Saving..." : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
