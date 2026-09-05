import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED = new Set(["full_name","phone","dob","org_type","gender","location","referral_source","secondary_phone","secondary_email","next_of_kin_name","next_of_kin_phone","next_of_kin_relationship"]);

export async function POST(request: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  let body: { userId?: string; fields?: Record<string, string> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const userId = body.userId?.trim() ?? "";
  const fields = body.fields ?? {};
  if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });

  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!ALLOWED.has(k)) continue;
    const val = String(v ?? "").trim();
    if (k === "dob") patch[k] = val ? val : null;
    else patch[k] = val ? val : null;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  if (patch.secondary_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.secondary_email)) return NextResponse.json({ error: "Invalid secondary email." }, { status: 400 });
  if (patch.dob && isNaN(Date.parse(patch.dob))) return NextResponse.json({ error: "Invalid dob." }, { status: 400 });

  const { error: upErr } = await supabase.from("profiles").upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (upErr) {
    const { error: updErr } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  revalidateTag("admin-clients", { expire: 30 });
  revalidateTag("admin-users", { expire: 30 });
  return NextResponse.json({ ok: true });
}
