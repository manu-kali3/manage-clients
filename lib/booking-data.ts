import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

export interface BookingRow {
  id: string;
  user_id: string;
  event_id: string;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_ref: string | null;
  created_at: string;
  event?: { title: string; event_date: string; event_time: string | null; is_online: boolean } | null;
  payment?: {
    method: string;
    status: string;
    phone: string | null;
    provider_ref: string | null;
    raw: { receipt?: string; claim?: { code: string; at: string } } | null;
    amount: number;
    created_at: string;
  } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_receipt?: string | null;
  claim_code?: string | null;
  claim_payhero?: { status: string; amount?: number; externalRef?: string } | null;
}

export interface SubscriberRow {
  id: string;
  email: string;
  name: string | null;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface CampaignRow {
  id: string;
  subject: string;
  body: string;
  recipient_count: number;
  sent_count: number;
  created_at: string;
}

/** Server-computed revenue summary for one event (covers ALL bookings,
 *  not just the most recent page). */
export interface RevenueByEventRow {
  key: string;
  title: string;
  date: string | null;
  isOnline: boolean | null;
  bookings: number;
  tickets: number;
  paid: number;
  pending: number;
  pendingAmt: number;
  cancelled: number;
}

const BOOKING_PAGE_SIZE = 1000;

async function fetchBookingsData() {
  let bookings: BookingRow[] = [];
  let dbError = "";

  if (!supabase) {
    return { bookings, dbError: "Database is not configured.", revenueByEvent: [] as RevenueByEventRow[] };
  }

  // Page through every booking (Supabase caps a single response at 1000 rows),
  // so revenue totals are not truncated to the latest N bookings.
  const columns =
    "id,user_id,event_id,quantity,amount,currency,status,payment_method,payment_ref,created_at," +
    "events(title,event_date,event_time,is_online)," +
    "payments(method,status,phone,provider_ref,raw,amount,created_at)";

  for (let page = 0; ; page++) {
    const from = page * BOOKING_PAGE_SIZE;
    const to = from + BOOKING_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("bookings")
      .select(columns)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      dbError = error.message;
      return { bookings, dbError, revenueByEvent: [] as RevenueByEventRow[] };
    }

    const rows = (data ?? []) as any[];
    bookings.push(...rows.map(normaliseBooking));
    if (rows.length < BOOKING_PAGE_SIZE) break;
  }

  // Resolve customer names/phones from profiles.
  const userIds = [...new Set(bookings.map((b) => b.user_id).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,phone")
      .in("id", userIds);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    bookings = bookings.map((b) => ({
      ...b,
      customer_name: byId.get(b.user_id)?.full_name ?? null,
      customer_phone: byId.get(b.user_id)?.phone ?? b.payment?.phone ?? null,
    }));
  }

  return { bookings, dbError, revenueByEvent: revenueByEvent(bookings) };
}

function normaliseBooking(b: any): BookingRow {
  const payment = Array.isArray(b.payments) ? (b.payments[0] ?? null) : (b.payments ?? null);
  return {
    ...b,
    event: Array.isArray(b.events) ? (b.events[0] ?? null) : (b.events ?? null),
    payment,
    payment_receipt: payment?.raw?.receipt ?? null,
    claim_code: payment?.raw?.claim?.code ?? null,
    claim_payhero: payment?.raw?.claim?.payhero ?? null,
  };
}

/** Aggregates paid/pending/cancelled revenue per event from the full dataset. */
function revenueByEvent(bookings: BookingRow[]): RevenueByEventRow[] {
  const map = new Map<string, RevenueByEventRow>();
  for (const b of bookings) {
    const key = b.event_id || "unknown";
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        title: b.event?.title ?? "Unknown event",
        date: b.event?.event_date ?? null,
        isOnline: b.event?.is_online ?? null,
        bookings: 0,
        tickets: 0,
        paid: 0,
        pending: 0,
        pendingAmt: 0,
        cancelled: 0,
      };
      map.set(key, row);
    }
    row.bookings += 1;
    if (b.status === "paid") {
      row.tickets += b.quantity;
      row.paid += Number(b.amount);
    } else if (b.status === "pending") {
      row.pending += 1;
      row.pendingAmt += Number(b.amount);
    } else if (b.status === "cancelled") {
      row.cancelled += 1;
    }
  }
  return [...map.values()].sort(
    (a, b) => b.paid - a.paid || (b.date ?? "").localeCompare(a.date ?? "")
  );
}

/**
 * Cached for 30s and invalidated on every status change (see PATCH) so the
 * bookings page stops re-hitting the database on each click.
 */
export const loadBookingsData = unstable_cache(fetchBookingsData, ["admin-bookings"], {
  revalidate: 30,
  tags: ["admin-bookings"],
});

export async function loadSubscribersData() {
  let subscribers: SubscriberRow[] = [];
  let dbError = "";

  if (supabase) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("id,email,name,source,subscribed_at,unsubscribed_at")
      .order("subscribed_at", { ascending: false });

    if (!error) {
      subscribers = (data ?? []) as SubscriberRow[];
    } else {
      dbError = error.message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  return { subscribers, dbError };
}

export async function loadCampaignsData() {
  let campaigns: CampaignRow[] = [];
  let dbError = "";

  if (supabase) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id,subject,body,recipient_count,sent_count,created_at")
      .order("created_at", { ascending: false });

    if (!error) {
      campaigns = (data ?? []) as CampaignRow[];
    } else {
      dbError = error.message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  return { campaigns, dbError };
}
