import { supabase } from "@/lib/supabase";
import { sendEmail, ticketConfirmation, ownerPaymentNotice } from "@/lib/email";
import { formatDate } from "@/lib/dates";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://events.brevansoftwares.co.ke";

export function ticketCodeOf(bookingId: string): string {
  return `BVN-${bookingId.replace(/-/g, "").toUpperCase()}`;
}

/** After an admin confirms a payment: email the customer their ticket + notify the owner. */
export async function notifyPaid(bookingId: string) {
  if (!supabase) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id,user_id,event_id,quantity,amount")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  const [{ data: event }, { data: payment }] = await Promise.all([
    supabase.from("events").select("title,event_date,event_time,is_online,stream_url").eq("id", booking.event_id).maybeSingle(),
    supabase.from("payments").select("method,status,amount,phone,raw").eq("booking_id", bookingId).maybeSingle(),
  ]);

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(booking.user_id);
  if (authError) console.error("admin notifyPaid auth:", authError.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,phone")
    .eq("id", booking.user_id)
    .maybeSingle();

  const name = profile?.full_name?.trim() || authUser?.user?.user_metadata?.full_name || "";
  const customerEmail = authUser?.user?.email ?? "";
  const streamUrl = event?.is_online && event.stream_url ? event.stream_url : undefined;

  if (customerEmail) {
    await sendEmail(
      ticketConfirmation({
        to: customerEmail,
        name,
        eventTitle: event?.title ?? "Event",
        eventDate: event
          ? `${formatDate(event.event_date)}${event.event_time ? ` at ${event.event_time}` : ""}`
          : "",
        quantity: booking.quantity ?? 1,
        amount: payment?.amount ?? booking.amount ?? 0,
        status: "paid",
        streamUrl,
        ticketCode: ticketCodeOf(booking.id),
        receiptUrl: `${SITE_URL}/tickets/${booking.id}`,
      })
    );
  }

  await sendEmail(
    ownerPaymentNotice({
      method: payment?.method ?? "",
      eventTitle: event?.title ?? "Event",
      customer: name || "A customer",
      email: customerEmail,
      phone: profile?.phone ?? "",
      amount: payment?.amount ?? booking.amount ?? 0,
      status: "paid",
    })
  );
}
