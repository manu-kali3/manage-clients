import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { loadBookingsData } from "@/lib/booking-data";
import { notifyPaid } from "@/lib/notify";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { bookings, dbError } = await loadBookingsData();
  if (dbError) {
    return NextResponse.json({ error: dbError }, { status: 500 });
  }
  return NextResponse.json({ bookings });
}

const VALID_STATUSES = ["free", "pending", "paid", "cancelled"];

/** Update a booking's status (e.g. mark paid manually, cancel). */
export async function PATCH(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let body: { id?: string; status?: string; receipt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = body.id?.trim() ?? "";
  const status = body.status?.trim() ?? "";
  const receipt = String(body.receipt ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "A valid booking id and status are required." }, { status: 400 });
  }

  const { data: booking, error: getErr } = await supabase
    .from("bookings")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (getErr || !booking) {
    console.error("bookings lookup error:", getErr);
    return NextResponse.json(
      { error: "Booking not found." },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("bookings update error:", error);
    return NextResponse.json(
      { error: "Could not update the booking. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-bookings", { expire: 30 });

  // Keep the payment row in sync when marking a booking paid/cancelled manually.
  if (status === "paid" || status === "cancelled") {
    const { data: payments } = await supabase
      .from("payments")
      .select("id,status,raw")
      .eq("booking_id", id);
    for (const p of payments ?? []) {
      if (p.status === "pending" || p.status === "claimed") {
        const patch: any = { status };
        if (status === "paid") {
          const raw = { ...(p.raw ?? {}) };
          if (receipt) raw.receipt = receipt;
          patch.raw = raw;
        }
        await supabase.from("payments").update(patch).eq("id", p.id);
      }
    }
  }

  if (status === "paid") {
    await notifyPaid(id);
  }

  return NextResponse.json({ ok: true });
}
