import type { Event } from "@/lib/supabase";
import type { AdminStats } from "@/lib/admin-data";
import { eventStatus, formatDate, todayIso } from "@/lib/dates";
import { Icons } from "./icons";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brevannew.vercel.app";

interface Props {
  events: Event[];
  dbError: string;
  stats: AdminStats;
}

export default function Dashboard({ events, dbError, stats }: Props) {
  const today = todayIso();
  const upcoming = events.filter((e) => e.event_date >= today).slice(0, 4);
  const nextEvent = events.find((e) => e.event_date >= today);
  const monthName = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

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

      <section className="welcome">
        <div>
          <h2>Welcome back, Admin</h2>
          <p>Here&apos;s what&apos;s happening with your events on Brevan Softwares.</p>
        </div>
        <div className="welcome-actions">
          <a className="btn" href="/scan">
            {Icons.scan}
            <span>Scan tickets</span>
          </a>
          <a className="btn light" href="/events">
            {Icons.calendar}
            <span>Manage events</span>
          </a>
          <a className="btn light" href={SITE_URL} target="_blank" rel="noopener noreferrer">
            {Icons.external}
            <span>View website</span>
          </a>
        </div>
      </section>

      <section className="stats" aria-label="Event statistics">
        <div className="stat-card">
          <span className="stat-icon navy">{Icons.calendar}</span>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total events</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">{Icons.clock}</span>
          <div>
            <div className="stat-value">{stats.upcoming}</div>
            <div className="stat-label">Upcoming</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon orange">{Icons.check}</span>
          <div>
            <div className="stat-value">{stats.past}</div>
            <div className="stat-label">Past</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon navy">{Icons.calendar}</span>
          <div>
            <div className="stat-value">{nextEvent ? formatDate(nextEvent.event_date) : "—"}</div>
            <div className="stat-label">Next event</div>
          </div>
        </div>
      </section>

      <div className="dash-grid">
        <section className="card">
          <div className="card-header">
            <h2>Upcoming events</h2>
            <span className="count-pill">{stats.upcoming}</span>
            <div className="card-action">
              <a className="btn ghost sm" href="/events">
                View all
              </a>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-icon">{Icons.clock}</div>
              <h3>Nothing scheduled yet</h3>
              <p>Add an upcoming event and it will show up here.</p>
              <a className="btn" href="/events">
                {Icons.plus}
                <span>Add an event</span>
              </a>
            </div>
          ) : (
            upcoming.map((event) => {
              const d = new Date(`${event.event_date}T00:00:00`);
              const status = eventStatus(event.event_date, today);
              return (
                <div className="up-item" key={event.id}>
                  <div className="date-chip" aria-hidden="true">
                    <span className="date-day">
                      {d.toLocaleDateString("en-GB", { day: "numeric" })}
                    </span>
                    <span className="date-mon">
                      {d.toLocaleDateString("en-GB", { month: "short" })}
                    </span>
                  </div>
                  <div className="up-info">
                    <div className="up-title">{event.title}</div>
                    <div className="up-meta">
                      {event.venue || "Venue TBC"}
                      {event.event_time ? ` · ${event.event_time}` : ""}
                    </div>
                  </div>
                  <span className={`badge ${status}`}>
                    <span className="badge-dot" />
                    {status === "today" ? "Today" : "Upcoming"}
                  </span>
                  <a className="btn ghost sm" href="/events">
                    Manage
                  </a>
                </div>
              );
            })
          )}
        </section>

        <aside className="dash-side">
          <section className="card">
            <div className="card-header">
              <h2>Quick actions</h2>
            </div>
            <div className="quick-actions">
              <a className="quick-action" href="/scan">
                <span className="qa-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary-600)" }}>
                  {Icons.scan}
                </span>
                <span>Scan tickets at the door</span>
                <span className="qa-arrow">{Icons.arrowRight}</span>
              </a>
              <a className="quick-action" href="/events">
                <span className="qa-icon">{Icons.plus}</span>
                <span>Add a new event</span>
                <span className="qa-arrow">{Icons.arrowRight}</span>
              </a>
              <a className="quick-action" href="/events">
                <span className="qa-icon" style={{ background: "var(--color-accent-50)", color: "var(--color-accent)" }}>
                  {Icons.calendar}
                </span>
                <span>Manage events</span>
                <span className="qa-arrow">{Icons.arrowRight}</span>
              </a>
              <a className="quick-action" href="/projects">
                <span className="qa-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary-600)" }}>
                  {Icons.image}
                </span>
                <span>Manage projects</span>
                <span className="qa-arrow">{Icons.arrowRight}</span>
              </a>
              <a className="quick-action" href="/settings">
                <span className="qa-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary-600)" }}>
                  {Icons.settings}
                </span>
                <span>Manage site images</span>
                <span className="qa-arrow">{Icons.arrowRight}</span>
              </a>
              <a className="quick-action" href={SITE_URL} target="_blank" rel="noopener noreferrer">
                <span className="qa-icon" style={{ background: "#eef0f6", color: "var(--color-navy)" }}>
                  {Icons.external}
                </span>
                <span>View website</span>
                <span className="qa-arrow">{Icons.arrowRight}</span>
              </a>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h2>This month</h2>
            </div>
            <div className="month-card">
              <div className="month-value">{stats.month}</div>
              <div className="month-label">events scheduled in {monthName}</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
