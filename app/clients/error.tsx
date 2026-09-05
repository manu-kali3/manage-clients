"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center", padding: "0 16px" }}>
      <h1 style={{ fontSize: 22, color: "#b3261e" }}>Something went wrong</h1>
      <p style={{ color: "#667085", marginTop: 8 }}>{error.message || "Could not load clients. Please try again."}</p>
      <button onClick={() => reset()} style={{ marginTop: 16, background: "#43ba7f", color: "#fff", padding: "10px 18px", borderRadius: 8, border: 0, fontWeight: 600, cursor: "pointer" }}>Try again</button>
    </div>
  );
}
