import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  let body: { bookingId?: string; body?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const bookingId = body.bookingId?.trim() ?? "";
  const text = body.body?.trim() ?? "";
  if (!bookingId) return NextResponse.json({ error: "bookingId required." }, { status: 400 });
  if (!text || text.length > 5000) return NextResponse.json({ error: "Message must be 1-5000 chars." }, { status: 400 });

  const { data: booking, error: bErr } = await supabase.from("service_bookings").select("id,user_id").eq("id", bookingId).maybeSingle();
  if (bErr || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const { data, error } = await supabase.from("service_comments").insert([{ booking_id: bookingId, user_id: booking.user_id, body: text, is_admin: true }]).select("id,booking_id,body,is_admin,created_at,user_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("admin-clients", { expire: 30 });
  return NextResponse.json({ ok: true, comment: data });
}
