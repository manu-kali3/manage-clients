"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ResetPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (password.length < 12) {
      setErr("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (!token) {
      setErr("Missing reset token. Use the link from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Reset failed.");
      } else {
        setDone(true);
        setMsg("Password has been reset. You can now sign in.");
      }
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ padding: 32, textAlign: "center" }}>
          <h2 style={{ color: "#2e9a66" }}>✓ Password reset</h2>
          <p>{msg}</p>
          <Link href="/login" className="btn block" style={{ marginTop: 16, display: "inline-flex" }}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-accent" aria-hidden="true" />
        <div className="login-body">
          <h1>Reset password</h1>
          <p>Enter your new admin password. Link expires in 1 hour.</p>
          {!token && <p className="msg err">No token found. Open the link from the manages account email.</p>}
          {err && <p className="msg err">{err}</p>}
          {msg && <p className="msg ok">{msg}</p>}
          <div className="field">
            <label htmlFor="new-pass">New password</label>
            <input id="new-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirm-pass">Confirm password</label>
            <input id="confirm-pass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn block" disabled={loading}>
            {loading ? "Saving..." : "Reset password"}
          </button>
          <p style={{ textAlign: "center", marginTop: 12 }}>
            <Link href="/login">Back to login</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
