"use client";

import { useEffect, useState } from "react";

export default function SecurityView() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (newPassword !== confirm) {
      notify("err", "New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Could not change password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      notify("ok", "Password updated. Use the new password next time you sign in.");
    } catch {
      notify("err", "Could not change password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="card">
        <div className="card-header">
          <h2>Change password</h2>
        </div>
        <div className="card-body">
          <p style={{ marginTop: 0, color: "var(--color-muted)", fontSize: 14 }}>
            Set a new password for the dashboard. The next time you sign in you
            will need to use this new password.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">
                  New password <span className="req">min. 8 characters</span>
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="card-footer" style={{ justifyContent: "flex-end", paddingBottom: 22 }}>
          <button
            type="button"
            className="btn"
            onClick={() => handleSubmit()}
            disabled={busy}
          >
            {busy ? "Saving..." : "Change password"}
          </button>
        </div>
      </section>

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
