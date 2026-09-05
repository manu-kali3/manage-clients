"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icons } from "./icons";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brevannew.vercel.app";

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AdminShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname === "/";
  const onEvents = pathname.startsWith("/events");
  const onProjects = pathname.startsWith("/projects");
  const onSettings = pathname.startsWith("/settings");
  const onSecurity = pathname.startsWith("/security");
  const onClients = pathname.startsWith("/clients");
  const onBookings = pathname.startsWith("/bookings");
  const onSubscribers = pathname.startsWith("/subscribers");
  const onScan = pathname.startsWith("/scan");
  const onUsers = pathname.startsWith("/users");

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/brevan-logo.jpg" alt="Brevan Softwares logo" />
          <div>
            <div className="brand-name">Brevan Softwares</div>
            <div className="brand-sub">Admin</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Menu</span>
          <a className={`nav-link ${onDashboard ? "active" : ""}`} href="/">
            <span className="nav-icon">{Icons.dashboard}</span>
            <span className="nav-label-text">Dashboard</span>
          </a>
          <a className={`nav-link ${onEvents ? "active" : ""}`} href="/events">
            <span className="nav-icon">{Icons.calendar}</span>
            <span className="nav-label-text">Events</span>
          </a>
          <a className={`nav-link ${onBookings ? "active" : ""}`} href="/bookings">
            <span className="nav-icon">{Icons.ticket}</span>
            <span className="nav-label-text">Bookings</span>
          </a>
          <a className={`nav-link ${onScan ? "active" : ""}`} href="/scan">
            <span className="nav-icon">{Icons.scan}</span>
            <span className="nav-label-text">Scan tickets</span>
          </a>
          <a className={`nav-link ${onClients ? "active" : ""}`} href="/clients">
            <span className="nav-icon">{Icons.users}</span>
            <span className="nav-label-text">Clients</span>
          </a>
          <a className={`nav-link ${onUsers ? "active" : ""}`} href="/users">
            <span className="nav-icon">{Icons.users}</span>
            <span className="nav-label-text">Users</span>
          </a>
          <a className={`nav-link ${onSubscribers ? "active" : ""}`} href="/subscribers">
            <span className="nav-icon">{Icons.mail}</span>
            <span className="nav-label-text">Subscribers</span>
          </a>
          <a className={`nav-link ${onProjects ? "active" : ""}`} href="/projects">
            <span className="nav-icon">{Icons.image}</span>
            <span className="nav-label-text">Projects</span>
          </a>
          <a className={`nav-link ${onSettings ? "active" : ""}`} href="/settings">
            <span className="nav-icon">{Icons.settings}</span>
            <span className="nav-label-text">Site Images</span>
          </a>
          <a className={`nav-link ${onSecurity ? "active" : ""}`} href="/security">
            <span className="nav-icon">{Icons.lock}</span>
            <span className="nav-label-text">Security</span>
          </a>
          <a className="nav-link" href={SITE_URL} target="_blank" rel="noopener noreferrer">
            <span className="nav-icon">{Icons.external}</span>
            <span className="nav-label-text">View website</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-link"
            onClick={handleLogout}
            style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <span className="nav-icon">{Icons.logout}</span>
            <span className="nav-label-text">Log out</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <span className="avatar">B</span>
              <span className="user-label">Admin</span>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
