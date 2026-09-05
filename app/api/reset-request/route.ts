import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { supabase } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

const ADMIN_EMAIL = "manukorir161@gmail.com";
const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const limiter = rateLimit(`reset-req:${clientIp(request)}`, 3, 60 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 500 });
  }

  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabase.from("site_settings").upsert([
    { key: "admin_reset_token_hash", value: hash, updated_at: new Date().toISOString() },
    { key: "admin_reset_token_expires", value: expiresAt, updated_at: new Date().toISOString() },
  ], { onConflict: "key" });

  if (error) {
    console.error("reset-request store:", error.message);
    return NextResponse.json({ error: "Could not create reset link." }, { status: 500 });
  }

  const origin = request.headers.get("origin") ?? `https://${request.headers.get("host") ?? "manage-brevan.vercel.app"}`;
  const resetUrl = `${origin.replace(/\/$/, "")}/reset?token=${token}`;

  const sent = await sendEmail({
    type: "admin-reset",
    to: ADMIN_EMAIL,
    subject: "Brevan Admin — Reset your password",
    text: [
      "You requested a password reset for Brevan Admin.",
      "",
      `Reset link (expires in 1 hour): ${resetUrl}`,
      "",
      "If you did not request this, ignore this email.",
    ].join("\n"),
  });

  if (!sent) {
    return NextResponse.json({ error: "Could not send reset email. Check email configuration." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
