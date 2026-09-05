"use client";

import { useEffect, useRef, useState } from "react";
import type { Event } from "@/lib/supabase";
import { eventStatus, formatDate, todayIso } from "@/lib/dates";
import { Icons } from "./icons";

interface Props {
  initialEvents: Event[];
  dbError: string;
}

interface FormState {
  id: string | null;
  title: string;
  event_date: string;
  event_time: string;
  venue: string;
  image_url: string;
  description: string;
  is_online: boolean;
  is_paid: boolean;
  ticket_price_kes: string;
  stream_platform: string;
  stream_url: string;
  capacity: string;
}

const EMPTY: FormState = {
  id: null,
  title: "",
  event_date: "",
  event_time: "",
  venue: "",
  image_url: "",
  description: "",
  is_online: false,
  is_paid: false,
  ticket_price_kes: "",
  stream_platform: "",
  stream_url: "",
  capacity: "",
};

export default function EventsView({ initialEvents, dbError }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Event | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const today = todayIso();

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (deleting) setDeleting(null);
        else if (formOpen) setFormOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, formOpen]);

  useEffect(() => {
    if (formOpen) {
      const t = setTimeout(() => titleRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [formOpen]);

  function openAdd() {
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(event: Event) {
    setForm({
      id: event.id,
      title: event.title,
      event_date: event.event_date,
      event_time: event.event_time ?? "",
      venue: event.venue ?? "",
      image_url: event.image_url ?? "",
      description: event.description ?? "",
      is_online: event.is_online,
      is_paid: event.is_paid,
      ticket_price_kes: event.ticket_price_kes ? String(event.ticket_price_kes) : "",
      stream_platform: event.stream_platform ?? "",
      stream_url: event.stream_url ?? "",
      capacity: event.capacity ? String(event.capacity) : "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    if (busy) return;
    setFormOpen(false);
    setForm(EMPTY);
  }

  function update(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function refresh() {
    const res = await fetch("/api/events", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setEvents(json.events);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);

    const payload = {
      title: form.title,
      event_date: form.event_date,
      event_time: form.event_time,
      venue: form.venue,
      image_url: form.image_url,
      description: form.description,
      is_online: form.is_online,
      is_paid: form.is_paid,
      ticket_price_kes: form.ticket_price_kes ? Number(form.ticket_price_kes) : undefined,
      stream_platform: form.stream_platform,
      stream_url: form.stream_url,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    };

    try {
      const res = form.id
        ? await fetch(`/api/events/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Something went wrong.");
        return;
      }

      notify("ok", form.id ? "Event updated successfully." : "Event created successfully.");
      setForm(EMPTY);
      setFormOpen(false);
      await refresh();
    } catch {
      notify("err", "Could not save the event. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        notify("err", json.error ?? "Delete failed.");
      } else {
        notify("ok", "Event deleted.");
        setEvents((prev) => prev.filter((e) => e.id !== deleting.id));
      }
    } catch {
      notify("err", "Could not delete the event.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
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

      <section className="card">
        <div className="card-header">
          <h2>All events</h2>
          <span className="count-pill">{events.length}</span>
          <div className="card-action">
            <button type="button" className="btn" onClick={openAdd}>
              {Icons.plus}
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{Icons.calendar}</div>
            <h3>No events yet</h3>
            <p>Create your first event and it will appear here and on the public website.</p>
            <button type="button" className="btn" onClick={openAdd}>
              {Icons.plus}
              <span>Add your first event</span>
            </button>
          </div>
        ) : (
          <>
            <div className="list-head">
              <div>Event</div>
              <div>Date</div>
              <div>Time</div>
              <div>Venue</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
            {events.map((event) => {
              const status = eventStatus(event.event_date, today);
              return (
                <div className="list-row" key={event.id}>
                  <div className="event-title-cell">
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="event-thumb" src={event.image_url} alt="" />
                    ) : (
                      <span className="event-thumb">{Icons.image}</span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="event-title">{event.title}</div>
                      <div className="mini-badges">
                        <span className={`mini-badge ${event.is_online ? "online" : "inperson"}`}>
                          {event.is_online ? "Online" : "In person"}
                        </span>
                        <span className={`mini-badge ${event.is_paid ? "paid" : "free"}`}>
                          {event.is_paid && event.ticket_price_kes
                            ? `KES ${Number(event.ticket_price_kes).toLocaleString("en-KE")}`
                            : "Free"}
                        </span>
                      </div>
                      {event.description && (
                        <div className="event-desc">{event.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="event-cell">{formatDate(event.event_date)}</div>
                  <div className="event-cell muted">{event.event_time || "—"}</div>
                  <div className="event-cell muted">{event.venue || "—"}</div>
                  <div>
                    <span className={`badge ${status}`}>
                      <span className="badge-dot" />
                      {status === "today" ? "Today" : status === "upcoming" ? "Upcoming" : "Past"}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="btn ghost sm" onClick={() => openEdit(event)}>
                      {Icons.edit}
                      <span>Edit</span>
                    </button>
                    <button type="button" className="btn danger-ghost sm" onClick={() => setDeleting(event)}>
                      {Icons.trash}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      {formOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-form-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 id="event-form-title">{form.id ? "Edit event" : "Add event"}</h2>
              <button type="button" className="modal-close" onClick={closeForm} aria-label="Close">
                {Icons.x}
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label htmlFor="title">
                    Event title <span className="req">*</span>
                  </label>
                  <input
                    ref={titleRef}
                    id="title"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. AI & Automation Bootcamp"
                    required
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="event_date">
                      Date <span className="req">*</span>
                    </label>
                    <input
                      id="event_date"
                      type="date"
                      value={form.event_date}
                      onChange={(e) => update("event_date", e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="event_time">Time</label>
                    <input
                      id="event_time"
                      value={form.event_time}
                      onChange={(e) => update("event_time", e.target.value)}
                      placeholder="e.g. 10:00 AM"
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="venue">Venue</label>
                    <input
                      id="venue"
                      value={form.venue}
                      onChange={(e) => update("venue", e.target.value)}
                      placeholder="e.g. Narok Town Hall"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="image_url">Thumbnail URL</label>
                    <input
                      id="image_url"
                      value={form.image_url}
                      onChange={(e) => update("image_url", e.target.value)}
                      placeholder="https://.../photo.jpg"
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Short summary shown on the website"
                  />
                  <div className="hint">A short summary shown on the website.</div>
                </div>

                <div className="field">
                  <label>Format</label>
                  <div className="segmented">
                    <button
                      type="button"
                      className={!form.is_online ? "active" : ""}
                      onClick={() => update("is_online", false)}
                    >
                      In person
                    </button>
                    <button
                      type="button"
                      className={form.is_online ? "active" : ""}
                      onClick={() => update("is_online", true)}
                    >
                      Online
                    </button>
                  </div>
                </div>

                {form.is_online && (
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="stream_platform">Stream platform</label>
                      <select
                        id="stream_platform"
                        value={form.stream_platform}
                        onChange={(e) => update("stream_platform", e.target.value)}
                      >
                        <option value="">Select platform</option>
                        <option value="youtube">YouTube</option>
                        <option value="googlemeet">Google Meet</option>
                        <option value="tiktok">TikTok Live</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="stream_url">Stream / meet link</label>
                      <input
                        id="stream_url"
                        value={form.stream_url}
                        onChange={(e) => update("stream_url", e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                      <div className="hint">Visible only to ticket holders.</div>
                    </div>
                  </div>
                )}

                <div className="field">
                  <label>Tickets</label>
                  <div className="segmented">
                    <button
                      type="button"
                      className={!form.is_paid ? "active" : ""}
                      onClick={() => update("is_paid", false)}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      className={form.is_paid ? "active" : ""}
                      onClick={() => update("is_paid", true)}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                <div className="field-row">
                  {form.is_paid && (
                    <div className="field">
                      <label htmlFor="ticket_price_kes">Ticket price (KES)</label>
                      <input
                        id="ticket_price_kes"
                        type="number"
                        min="1"
                        step="1"
                        value={form.ticket_price_kes}
                        onChange={(e) => update("ticket_price_kes", e.target.value)}
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="capacity">Capacity</label>
                    <input
                      id="capacity"
                      type="number"
                      min="1"
                      step="1"
                      value={form.capacity}
                      onChange={(e) => update("capacity", e.target.value)}
                      placeholder="e.g. 100 (blank = unlimited)"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn ghost" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : form.id ? "Save changes" : "Add event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="modal-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleting(null);
          }}
        >
          <div className="modal small">
            <div className="modal-header">
              <h2 id="delete-dialog-title">Delete event?</h2>
              <button type="button" className="modal-close" onClick={() => setDeleting(null)} aria-label="Close">
                {Icons.x}
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 14 }}>
                <strong style={{ color: "var(--color-text)" }}>{deleting.title}</strong> will be
                permanently removed from the website. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button type="button" className="btn danger-ghost" onClick={confirmDelete} disabled={busy}>
                {Icons.trash}
                <span>{busy ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.type === "ok" ? Icons.check : Icons.alert}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
