import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/auth";
import { checkPassword } from "@/lib/password";
import { supabase } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminSession, newAdminToken } from "@/lib/sessions";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const limiter = rateLimit(`login:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Admin password is not configured." },
      { status: 500 }
    );
  }

  if (!(await checkPassword(body.password ?? ""))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = newAdminToken();
  const saved = await createAdminSession(token);
  if (!saved) {
    return NextResponse.json(
      { error: "Could not start a session. Database is unavailable." },
      { status: 500 }
    );
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
