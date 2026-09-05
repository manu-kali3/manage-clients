"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubscriberRow, CampaignRow } from "@/lib/booking-data";
import { Icons } from "./icons";

interface Props {
  initialSubscribers: SubscriberRow[];
  initialCampaigns: CampaignRow[];
  dbError: string;
}

export default function SubscribersView({ initialSubscribers, initialCampaigns, dbError }: Props) {
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>(initialSubscribers);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns);
  const [onlyActive, setOnlyActive] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const shown = useMemo(
    () => (onlyActive ? subscribers.filter((s) => !s.unsubscribed_at) : subscribers),
    [subscribers, onlyActive]
  );

  const activeCount = subscribers.filter((s) => !s.unsubscribed_at).length;

  async function sendCampaign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Could not send the campaign.");
        return;
      }
      notify("ok", `Campaign sent to ${json.sent} of ${json.campaign?.recipient_count ?? 0} subscribers.`);
      setSubject("");
      setBody("");
      setCampaigns((prev) => [json.campaign, ...prev]);
      setPreviewOpen(false);
    } catch {
      notify("err", "Network error while sending the campaign.");
    } finally {
      setBusy(false);
    }
  }

  function togglePreview() {
    if (previewOpen) setPreviewOpen(false);
    else if (subject.trim() || body.trim()) setPreviewOpen(true);
  }

  return (
    <div>
      {dbError && (
        <div className="banner error" role="alert">
          <span className="banner-icon">{Icons.alert}</span>
          <span>
            <strong>Database error:</strong> {dbError}
          </span>
        </div>
      )}

      <div className="sub-grid">
        <section className="card">
          <div className="card-header">
            <h2>Subscribers</h2>
            <span className="count-pill">{activeCount} active</span>
          </div>

          <div className="toolbar">
            <div className="filter-tabs">
              <button
                type="button"
                className={`filter-tab ${onlyActive ? "active" : ""}`}
                onClick={() => setOnlyActive(true)}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                className={`filter-tab ${!onlyActive ? "active" : ""}`}
                onClick={() => setOnlyActive(false)}
              >
                All ({subscribers.length})
              </button>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icons.users}</div>
              <h3>No subscribers yet</h3>
              <p>People who sign up on the events portal or the website newsletter appear here.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Source</th>
                      <th>Subscribed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => (
                      <tr key={s.id}>
                        <td className="cell-primary">{s.email}</td>
                        <td>{s.name || "—"}</td>
                        <td>
                          <span className={`badge source-${s.source}`}>{s.source}</span>
                        </td>
                        <td className="muted">
                          {new Date(s.subscribed_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td>
                          {s.unsubscribed_at ? (
                            <span className="badge status-cancelled">unsubscribed</span>
                          ) : (
                            <span className="badge status-paid">subscribed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-foot muted">
                Showing {shown.length} of {subscribers.length} subscribers
              </div>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Send email to all</h2>
            <span className="count-pill">{Icons.mail}</span>
          </div>

          <form onSubmit={sendCampaign} className="campaign-form">
            <div className="field">
              <label htmlFor="campaign_subject">
                Subject <span className="req">*</span>
              </label>
              <input
                id="campaign_subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. New training event next week"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="campaign_body">
                Message <span className="req">*</span>
              </label>
              <textarea
                id="campaign_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here. It is sent to every active subscriber."
                required
              />
              <div className="hint">
                Sends to all {activeCount} active subscribers via Resend. Each email is recorded.
              </div>
            </div>
            <div className="field-row">
              <button type="button" className="btn ghost" onClick={togglePreview}>
                Preview
              </button>
              <button type="submit" className="btn" disabled={busy || activeCount === 0}>
                {busy ? "Sending..." : `Send to ${activeCount} subscribers`}
              </button>
            </div>
          </form>

          {previewOpen && (
            <div className="preview-box">
              <strong>{subject}</strong>
              <p>{body}</p>
            </div>
          )}

          {campaigns.length > 0 && (
            <>
              <h3 className="section-title">Campaign history</h3>
              {campaigns.slice(0, 10).map((c) => (
                <div className="campaign-row" key={c.id}>
                  <div>
                    <div className="cell-primary">{c.subject}</div>
                    <div className="cell-sub">
                      {new Date(c.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span className="count-pill">
                    {c.sent_count}/{c.recipient_count} sent
                  </span>
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.type === "ok" ? Icons.check : Icons.alert}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
