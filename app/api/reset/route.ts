import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabase } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { storePassword } from "@/lib/password";
import { revokeAllAdminSessions } from "@/lib/sessions";

export async function POST(request: Request) {
  const limiter = rateLimit(`reset:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 500 });
  }

  let body: { token?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  const next = body.newPassword ?? "";

  if (!token || next.length < 12) {
    return NextResponse.json({ error: "Token required and password must be at least 12 characters." }, { status: 400 });
  }

  const hash = createHash("sha256").update(token).digest("hex");

  const { data, error } = await supabase.from("site_settings").select("key,value").in("key", ["admin_reset_token_hash", "admin_reset_token_expires"]);
  if (error || !data) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
  }
  const map: Record<string, string> = {};
  for (const r of data) map[r.key] = r.value;

  if (!map.admin_reset_token_hash || map.admin_reset_token_hash !== hash) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
  }
  if (map.admin_reset_token_expires && new Date(map.admin_reset_token_expires).getTime() < Date.now()) {
    return NextResponse.json({ error: "Reset link has expired. Request a new one." }, { status: 400 });
  }

  const ok = await storePassword(next);
  if (!ok) {
    return NextResponse.json({ error: "Could not save password." }, { status: 500 });
  }

  await supabase.from("site_settings").delete().in("key", ["admin_reset_token_hash", "admin_reset_token_expires"]);
  await revokeAllAdminSessions();

  return NextResponse.json({ ok: true });
}
