import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { parseTicketCode } from "@/lib/scan";
import { formatDate } from "@/lib/dates";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export type ScanStatus = "valid" | "pending" | "cancelled" | "not_found" | "invalid";

export interface ScanResult {
  status: ScanStatus;
  ticketCode?: string;
  bookingId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string | null;
  venue?: string | null;
  isOnline?: boolean;
  quantity?: number;
  amount?: number;
  booker?: string;
  email?: string;
  phone?: string | null;
  bookingStatus?: string;
}

export async function POST(request: Request) {
  const limiter = rateLimit(`admin:scan:${clientIp(request)}`, 60, 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many scans." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const bookingId = parseTicketCode(body.code ?? "");
  const result: ScanResult = !bookingId
    ? { status: "invalid" }
    : await lookupBooking(supabase, bookingId);

  return NextResponse.json({ ok: true, result });
}

interface BookingRow {
  id: string;
  user_id: string;
  event_id: string;
  quantity: number;
  amount: number;
  status: string;
  events?: { title: string; event_date: string; event_time: string | null; venue: string | null; is_online: boolean } | null;
}

async function lookupBooking(db: NonNullable<typeof supabase>, bookingId: string): Promise<ScanResult> {
  const { data, error } = await db
    .from("bookings")
    .select(
      "id,user_id,event_id,quantity,amount,status,payment_method,created_at," +
        "events(title,event_date,event_time,venue,is_online)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    return { status: "not_found", ticketCode: display(bookingId), bookingId };
  }

  const booking = data as unknown as BookingRow;
  const event = Array.isArray(booking.events) ? (booking.events[0] ?? null) : (booking.events ?? null);

  let booker = "";
  let email = "";
  let phone: string | null = null;

  const { data: profile } = await db
    .from("profiles")
    .select("full_name,phone")
    .eq("id", booking.user_id)
    .maybeSingle();

  const { data: authUser, error: authErr } = await db.auth.admin.getUserById(booking.user_id);
  if (!authErr && authUser?.user) {
    email = authUser.user.email ?? "";
    booker = (authUser.user.user_metadata?.full_name as string) ?? "";
  }

  booker = profile?.full_name?.trim() || booker || "Ticket holder";

  const status: ScanStatus =
    booking.status === "free" || booking.status === "paid"
      ? "valid"
      : booking.status === "cancelled"
        ? "cancelled"
        : "pending";

  return {
    status,
    ticketCode: display(booking.id),
    bookingId: booking.id,
    eventTitle: event?.title ?? "Event",
    eventDate: event?.event_date ? formatDate(event.event_date) : undefined,
    eventTime: event?.event_time ?? null,
    venue: event?.venue ?? null,
    isOnline: event?.is_online ?? false,
    quantity: booking.quantity,
    amount: Number(booking.amount ?? 0),
    booker,
    email,
    phone: profile?.phone ?? phone,
    bookingStatus: booking.status,
  };
}

function display(bookingId: string): string {
  const hex = bookingId.replace(/-/g, "").toUpperCase();
  const groups = hex.match(/.{1,4}/g) ?? [];
  return `BVN-${groups.join(" ")}`;
}
