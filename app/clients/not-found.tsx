import Link from "next/link";
export default function NotFound() {
  return (
    <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, color: "#212741" }}>Clients not found</h1>
      <p style={{ color: "#667085", marginTop: 8 }}>No client matches that ID or the link is outdated.</p>
      <Link href="/clients" style={{ display: "inline-block", marginTop: 16, background: "#43ba7f", color: "#fff", padding: "10px 18px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Back to clients</Link>
    </div>
  );
}
