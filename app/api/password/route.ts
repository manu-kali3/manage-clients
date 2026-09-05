import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAuthed, ADMIN_COOKIE } from "@/lib/auth";
import { checkPassword, storePassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revokeAllAdminSessions } from "@/lib/sessions";

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const limiter = rateLimit(`password:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";
  if (typeof current !== "string" || typeof next !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (next.length < 12) {
    return NextResponse.json(
      { error: "New password must be at least 12 characters." },
      { status: 400 }
    );
  }
  if (next === current) {
    return NextResponse.json(
      { error: "New password must be different from the current one." },
      { status: 400 }
    );
  }

  if (!(await checkPassword(current))) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const ok = await storePassword(next);
  if (!ok) {
    return NextResponse.json(
      { error: "Could not save the new password. Database is unavailable." },
      { status: 500 }
    );
  }

  // A password change revokes every session, including this one.
  await revokeAllAdminSessions();
  const store = await cookies();
  store.delete(ADMIN_COOKIE);

  return NextResponse.json({ ok: true });
}
