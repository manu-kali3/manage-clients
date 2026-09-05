import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
const VALID = new Set(["pending","in_progress","review","completed","cancelled"]);

export async function POST(request: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  let body: { bookingId?: string; status?: string; amount?: string | number; project_url?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const bookingId = body.bookingId?.trim() ?? "";
  if (!bookingId) return NextResponse.json({ error: "bookingId required." }, { status: 400 });

  const patch: Record<string, any> = {};
  if (body.status != null) {
    const s = String(body.status).trim();
    if (!VALID.has(s)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    patch.status = s;
  }
  if (body.amount != null && String(body.amount).trim() !== "") {
    const n = Number(body.amount);
    if (isNaN(n) || n < 0) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    patch.amount = n;
  } else if (body.amount != null && String(body.amount).trim() === "") {
    patch.amount = 0;
  }
  if (body.project_url != null) {
    const u = String(body.project_url).trim();
    if (u && !/^https?:\/\/.+/i.test(u)) return NextResponse.json({ error: "project_url must start with http(s)://" }, { status: 400 });
    patch.project_url = u || null;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No fields to update." }, { status: 400 });

  const { data: booking, error: getErr } = await supabase.from("service_bookings").select("id").eq("id", bookingId).maybeSingle();
  if (getErr || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const { error } = await supabase.from("service_bookings").update(patch).eq("id", bookingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("admin-clients", { expire: 30 });
  return NextResponse.json({ ok: true });
}
