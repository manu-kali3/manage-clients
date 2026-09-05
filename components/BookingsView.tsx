"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookingRow, RevenueByEventRow } from "@/lib/booking-data";
import { formatDate } from "@/lib/dates";
import { Icons } from "./icons";

interface Props {
  initialBookings: BookingRow[];
  initialRevenue: RevenueByEventRow[];
  dbError: string;
}

interface EventGroup {
  key: string;
  title: string;
  date: string | null;
  time: string | null;
  isOnline: boolean | null;
  rows: BookingRow[];
}

const groupOf = (b: BookingRow) => ({
  key: b.event_id || "unknown",
  title: b.event?.title ?? "Unknown event",
  date: b.event?.event_date ?? null,
  time: b.event?.event_time ?? null,
  isOnline: b.event?.is_online ?? null,
});

export default function BookingsView({ initialBookings, initialRevenue, dbError }: Props) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [revenueRows, setRevenueRows] = useState<RevenueByEventRow[]>(initialRevenue);
  const [filter, setFilter] = useState<"all" | "paid" | "free" | "pending" | "claimed" | "cancelled">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  function notify(type: "ok" | "err", text: string) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const shown = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "claimed") return bookings.filter((b) => b.payment?.status === "claimed");
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    for (const b of bookings) c[b.status] = (c[b.status] ?? 0) + 1;
    c.claimed = bookings.filter((b) => b.payment?.status === "claimed").length;
    return c;
  }, [bookings]);

  const totalRevenue = useMemo(
    () => revenueRows.reduce((sum, r) => sum + r.paid, 0),
    [revenueRows]
  );

  /** Bookings grouped by event (respects the active status filter). */
  const groups = useMemo(() => {
    const map = new Map<string, EventGroup>();
    for (const b of shown) {
      const g = groupOf(b);
      let group = map.get(g.key);
      if (!group) {
        group = { ...g, rows: [] };
        map.set(g.key, group);
      }
      group.rows.push(b);
    }
    const revenueOf = (g: EventGroup) =>
      g.rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
    return [...map.values()].sort(
      (a, b) => revenueOf(b) - revenueOf(a) || (b.date ?? "").localeCompare(a.date ?? "")
    );
  }, [shown]);

  /** Per-event revenue summary, fetched from the server (covers ALL
   *  bookings, not just the ones currently on screen). */
  const revenueTotals = useMemo(
    () =>
      revenueRows.reduce(
        (t, r) => ({
          bookings: t.bookings + r.bookings,
          tickets: t.tickets + r.tickets,
          paid: t.paid + r.paid,
          pending: t.pending + r.pending,
          pendingAmt: t.pendingAmt + r.pendingAmt,
          cancelled: t.cancelled + r.cancelled,
        }),
        { bookings: 0, tickets: 0, paid: 0, pending: 0, pendingAmt: 0, cancelled: 0 }
      ),
    [revenueRows]
  );

  /** The event currently being inspected (drill-down view). */
  const selected = useMemo(() => {
    if (!selectedEvent) return null;
    const rows = shown.filter((b) => (b.event_id || "unknown") === selectedEvent);
    const first = bookings.find((b) => (b.event_id || "unknown") === selectedEvent);
    return {
      title: first?.event?.title ?? "Unknown event",
      date: first?.event?.event_date ?? null,
      time: first?.event?.event_time ?? null,
      isOnline: first?.event?.is_online ?? null,
      rows,
    };
  }, [selectedEvent, shown, bookings]);

  /** Move one booking's numbers between the revenue buckets after a status change. */
  function applyRevenueChange(b: BookingRow, newStatus: string) {
    const key = b.event_id || "unknown";
    const amount = Number(b.amount);
    setRevenueRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r };
        const oldStatus = b.status;
        if (oldStatus === "paid") {
          next.paid -= amount;
          next.tickets -= b.quantity;
        } else if (oldStatus === "pending") {
          next.pending -= 1;
          next.pendingAmt -= amount;
        } else if (oldStatus === "cancelled") {
          next.cancelled -= 1;
        }
        if (newStatus === "paid") {
          next.paid += amount;
          next.tickets += b.quantity;
        } else if (newStatus === "pending") {
          next.pending += 1;
          next.pendingAmt += amount;
        } else if (newStatus === "cancelled") {
          next.cancelled += 1;
        }
        return next;
      })
    );
  }

  async function setStatus(booking: BookingRow, status: string, receipt = "") {
    setBusyId(booking.id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status, ...(receipt ? { receipt } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify("err", json.error ?? "Update failed.");
        return;
      }
      notify(
        "ok",
        receipt
          ? `Payment confirmed (${receipt}); ticket emailed to the customer.`
          : `Booking marked as ${status}.`
      );
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== booking.id) return b;
          const payment = b.payment ? { ...b.payment, status } : b.payment;
          return {
            ...b,
            status,
            payment,
            ...(receipt ? { payment_receipt: receipt, claim_code: null } : {}),
          };
        })
      );
      applyRevenueChange(booking, status);
    } catch {
      notify("err", "Could not update the booking.");
    } finally {
      setBusyId(null);
    }
  }

  function BookingsTable({ rows }: { rows: BookingRow[] }) {
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Event</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>
                  <div className="cell-primary">{b.customer_name || "—"}</div>
                  <div className="cell-sub">{b.customer_phone || b.user_id || "—"}</div>
                </td>
                <td>
                  <div className="cell-primary">{b.event?.title ?? "Event"}</div>
                  <div className="cell-sub">
                    {b.event?.is_online ? "Online" : "In person"}
                    {b.payment?.phone ? ` · ${b.payment.phone}` : ""}
                  </div>
                </td>
                <td className="muted">
                  {b.event?.event_date ? formatDate(b.event.event_date) : "—"}
                  {b.event?.event_time ? `, ${b.event.event_time}` : ""}
                </td>
                <td>{b.quantity}</td>
                <td>
                  {Number(b.amount) > 0
                    ? `KES ${Number(b.amount).toLocaleString("en-KE")}`
                    : "Free"}
                </td>
                <td>
                  <span className="cell-primary">{b.payment_method ?? "—"}</span>
                  {b.payment && (
                    <div className="cell-sub">
                      <span className={`badge status-${b.payment.status}`}>
                        <span className="badge-dot" />
                        {b.payment.status}
                      </span>
                    </div>
                  )}
                  {b.claim_code && <div className="cell-sub">Code: {b.claim_code}</div>}
                  {b.claim_payhero && (
                    <div className="cell-sub">
                      PayHero: {b.claim_payhero.status}
                      {typeof b.claim_payhero.amount === "number"
                        ? ` · KES ${b.claim_payhero.amount}`
                        : ""}
                      {b.claim_payhero.externalRef ? ` · ${b.claim_payhero.externalRef.slice(0, 8)}…` : ""}
                    </div>
                  )}
                  {b.payment_receipt && <div className="cell-sub">Receipt: {b.payment_receipt}</div>}
                  {b.payment_ref && <div className="cell-sub">{b.payment_ref}</div>}
                  {b.payment?.provider_ref && (
                    <div className="cell-sub">Provider ref: {b.payment.provider_ref}</div>
                  )}
                </td>
                <td>
                  <span className={`badge status-${b.status}`}>
                    <span className="badge-dot" />
                    {b.status}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    {b.payment?.status === "claimed" && (
                      <button
                        type="button"
                        className="btn ghost sm"
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b, "paid", b.claim_code ?? "")}
                      >
                        {Icons.check}
                        <span>Confirm payment</span>
                      </button>
                    )}
                    {b.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="btn ghost sm"
                          disabled={busyId === b.id}
                          onClick={() => setStatus(b, "paid")}
                        >
                          {Icons.check}
                          <span>Mark paid</span>
                        </button>
                        <button
                          type="button"
                          className="btn danger-ghost sm"
                          disabled={busyId === b.id}
                          onClick={() => setStatus(b, "cancelled")}
                        >
                          {Icons.x}
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                    {(b.status === "paid" || b.status === "free") && (
                      <button
                        type="button"
                        className="btn danger-ghost sm"
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b, "cancelled")}
                      >
                        {Icons.x}
                        <span>Cancel</span>
                      </button>
                    )}
                    {b.status === "cancelled" && (
                      <button
                        type="button"
                        className="btn ghost sm"
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b, b.payment_method === "free" ? "free" : "paid")}
                      >
                        {Icons.check}
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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

      {!selected && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value">{bookings.length}</span>
            <span className="stat-label">Total bookings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              KES {totalRevenue.toLocaleString("en-KE")}
            </span>
            <span className="stat-label">Paid revenue</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{counts.pending ?? 0}</span>
            <span className="stat-label">Awaiting payment</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{counts.claimed ?? 0}</span>
            <span className="stat-label">Payment claims</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{counts.free ?? 0}</span>
            <span className="stat-label">Free bookings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{groups.length}</span>
            <span className="stat-label">Events with bookings</span>
          </div>
        </div>
      )}

      {selected ? (
        <section className="card">
          <div className="card-header">
            <h2>{selected.title}</h2>
            <span className="count-pill">{selected.rows.length}</span>
            <div className="card-action">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setSelectedEvent(null)}
              >
                {Icons.arrowLeft}
                <span>All events</span>
              </button>
            </div>
          </div>
          <div className="event-group-head">
            <div className="event-group-meta">
              {selected.date ? formatDate(selected.date) : "Date TBC"}
              {selected.time ? `, ${selected.time}` : ""}
              {" · "}
              {selected.isOnline ? "Online" : "In person"}
            </div>
            <div className="event-group-stats">
              <span className="event-group-stat">
                <strong>{selected.rows.length}</strong> booking{selected.rows.length === 1 ? "" : "s"}
              </span>
              <span className="event-group-stat">
                <strong>
                  {selected.rows
                    .filter((r) => r.status === "paid")
                    .reduce((s, r) => s + r.quantity, 0)}
                </strong>{" "}
                ticket{selected.rows.filter((r) => r.status === "paid").length === 1 ? "" : "s"}
              </span>
              <span className="event-group-stat">
                <strong>
                  KES{" "}
                  {selected.rows
                    .filter((r) => r.status === "paid")
                    .reduce((s, r) => s + Number(r.amount), 0)
                    .toLocaleString("en-KE")}
                </strong>{" "}
                paid
              </span>
              <span className="event-group-stat">
                <strong>{selected.rows.filter((r) => r.status === "pending").length}</strong> pending
              </span>
              <span className="event-group-stat">
                <strong>{selected.rows.filter((r) => r.status === "cancelled").length}</strong>{" "}
                cancelled
              </span>
            </div>
          </div>
          <div className="card-header event-tabs-row">
            <div className="filter-tabs">
              {(["all", "paid", "pending", "claimed", "free", "cancelled"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`filter-tab ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  <span className="filter-count">
                    {f === "claimed"
                      ? selected.rows.filter((r) => r.payment?.status === "claimed").length
                      : selected.rows.filter((r) => (f === "all" ? true : r.status === f)).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {selected.rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icons.ticket}</div>
              <h3>No {filter === "all" ? "" : `${filter} `}bookings</h3>
              <p>No bookings match this filter for {selected.title}.</p>
            </div>
          ) : (
            <>
              <BookingsTable rows={selected.rows} />
              <div className="card-foot muted">
                {selected.rows.length} booking{selected.rows.length === 1 ? "" : "s"} for {selected.title}
                {filter !== "all" ? ` · filter: ${filter}` : ""}
              </div>
            </>
          )}
        </section>
      ) : (
        <>
      <section className="card">
        <div className="card-header">
          <h2>Revenue by event</h2>
          <span className="count-pill">{revenueRows.length}</span>
          <div className="card-action">
            <span className="muted small">Click an event to view its bookings</span>
          </div>
        </div>
        {revenueRows.length === 0 ? (
          <div className="empty-state small">
            <div className="empty-icon">{Icons.calendar}</div>
            <h3>No revenue data</h3>
            <p>Bookings from the events portal will appear here.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th className="num">Bookings</th>
                    <th className="num">Tickets</th>
                    <th className="num">Paid revenue</th>
                    <th className="num">Pending</th>
                    <th className="num">Pending amount</th>
                    <th className="num">Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueRows.map((r) => (
                    <tr
                      key={r.key}
                      className="clickable-row"
                      role="button"
                      tabIndex={0}
                      aria-label={`View bookings for ${r.title}`}
                      onClick={() => {
                        setFilter("all");
                        setSelectedEvent(r.key);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setFilter("all");
                          setSelectedEvent(r.key);
                        }
                      }}
                    >
                      <td>
                        <div className="cell-primary event-link">
                          {r.title}
                          <span className="event-link-arrow">{Icons.arrowRight}</span>
                        </div>
                        <div className="cell-sub">{r.isOnline ? "Online" : "In person"}</div>
                      </td>
                      <td className="muted">{r.date ? formatDate(r.date) : "—"}</td>
                      <td className="num">{r.bookings}</td>
                      <td className="num">{r.tickets}</td>
                      <td className="num">
                        <strong>KES {r.paid.toLocaleString("en-KE")}</strong>
                      </td>
                      <td className="num">{r.pending || "—"}</td>
                      <td className="num muted">
                        {r.pendingAmt > 0 ? `KES ${r.pendingAmt.toLocaleString("en-KE")}` : "—"}
                      </td>
                      <td className="num">{r.cancelled || "—"}</td>
                    </tr>
                  ))}
                  <tr className="revenue-total">
                    <td colSpan={3}>
                      <strong>Total</strong>
                    </td>
                    <td className="num">
                      <strong>{revenueTotals.tickets}</strong>
                    </td>
                    <td className="num">
                      <strong>KES {revenueTotals.paid.toLocaleString("en-KE")}</strong>
                    </td>
                    <td className="num">
                      <strong>{revenueTotals.pending}</strong>
                    </td>
                    <td className="num">
                      <strong>
                        {revenueTotals.pendingAmt > 0
                          ? `KES ${revenueTotals.pendingAmt.toLocaleString("en-KE")}`
                          : "—"}
                      </strong>
                    </td>
                    <td className="num">
                      <strong>{revenueTotals.cancelled}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card-foot muted">
              {revenueTotals.bookings} bookings across {revenueRows.length} events · sorted by paid revenue
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Bookings by event</h2>
          <div className="filter-tabs">
            {(["all", "paid", "pending", "claimed", "free", "cancelled"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-tab ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
                <span className="filter-count">{counts[f] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{Icons.ticket}</div>
            <h3>No bookings yet</h3>
            <p>Bookings from the events portal will appear here.</p>
          </div>
        ) : (
          <>
            {groups.map((g) => {
              const paid = g.rows.filter((r) => r.status === "paid");
              const revenue = paid.reduce((s, r) => s + Number(r.amount), 0);
              const tickets = paid.reduce((s, r) => s + r.quantity, 0);
              return (
                <div className="event-group" key={g.key}>
                  <div className="event-group-head">
                    <div>
                      <div className="event-group-title">{g.title}</div>
                      <div className="event-group-meta">
                        {g.date ? formatDate(g.date) : "Date TBC"}
                        {g.time ? `, ${g.time}` : ""}
                        {" · "}
                        {g.isOnline ? "Online" : "In person"}
                      </div>
                    </div>
                    <div className="event-group-stats">
                      <span className="event-group-stat">
                        <strong>{g.rows.length}</strong> booking{g.rows.length === 1 ? "" : "s"}
                      </span>
                      <span className="event-group-stat">
                        <strong>{tickets}</strong> ticket{tickets === 1 ? "" : "s"}
                      </span>
                      <span className="event-group-stat">
                        <strong>KES {revenue.toLocaleString("en-KE")}</strong> paid
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        setFilter("all");
                        setSelectedEvent(g.key);
                      }}
                    >
                      {Icons.arrowRight}
                      <span>View</span>
                    </button>
                  </div>
                  <BookingsTable rows={g.rows} />
                </div>
              );
            })}
            <div className="card-foot muted">
              Shown: {shown.length} of {bookings.length} bookings · grouped by event, sorted by paid revenue
            </div>
          </>
        )}
      </section>
        </>
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
