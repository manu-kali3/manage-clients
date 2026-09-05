"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const json = await res.json();
        setError(json.error ?? "Login failed.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-accent" aria-hidden="true" />
        <div className="login-body">
          <div className="login-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/images/brevan-logo.jpg" alt="Brevan Softwares logo" />
            <div>
              <div className="brand-name">Brevan Softwares</div>
              <div className="brand-sub">Admin</div>
            </div>
          </div>

          <h1>Sign in</h1>
          <p>Enter your admin password to manage events.</p>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn block" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button
              type="button"
              onClick={async () => {
                setError("");
                setInfo("");
                setResetLoading(true);
                try {
                  const res = await fetch("/api/reset-request", { method: "POST" });
                  const data = await res.json();
                  if (res.ok) setInfo("Reset link sent to manages account email. Check inbox (expires in 1 hour).");
                  else setError(data.error ?? "Could not send reset email.");
                } catch {
                  setError("Could not send reset email.");
                } finally {
                  setResetLoading(false);
                }
              }}
              disabled={resetLoading}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: resetLoading ? "not-allowed" : "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                opacity: resetLoading ? 0.6 : 1,
              }}
            >
              {resetLoading ? "Sending..." : "Forgot password? Send reset link"}
            </button>
          </div>
          {info && <p className="msg ok" style={{ textAlign: "center" }}>{info}</p>}
          {error && <p className="msg err" style={{ textAlign: "center" }}>{error}</p>}
        </div>
        <div className="login-footer">
          Restricted area · Brevan Softwares
        </div>
      </form>
    </div>
  );
}
