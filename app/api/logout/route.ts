import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/auth";
import { revokeAdminSession } from "@/lib/sessions";

export async function POST() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value ?? "";
  if (token) await revokeAdminSession(token);
  store.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
