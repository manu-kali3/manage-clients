import { cookies } from "next/headers";
import { isAdminSession } from "@/lib/sessions";

export const ADMIN_COOKIE = "brevan_admin";

/** A visitor is authenticated only when they present a valid, unrevoked,
 *  unexpired admin session cookie. Fails closed on any doubt. */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value ?? "";
  if (!token || token.length < 32) return false;
  return isAdminSession(token);
}
