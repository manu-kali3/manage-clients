import { createHash, randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";

/**
 * Per-login admin sessions, stored hashed in the existing site_settings
 * table (no DDL needed). A fresh login replaces all previous sessions, so a
 * stolen cookie is revoked by logout or password change.
 */

const SESSION_PREFIX = "admin_session_";
const SESSION_DAYS = 7;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function newAdminToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createAdminSession(token: string): Promise<boolean> {
  if (!supabase) return false;
  // Single-session model: drop every existing session first.
  await supabase
    .from("site_settings")
    .delete()
    .like("key", `${SESSION_PREFIX}%`);

  const { error } = await supabase.from("site_settings").insert({
    key: SESSION_PREFIX + hash(token),
    value: JSON.stringify({
      expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(),
      revoked_at: null,
    }),
    updated_at: new Date().toISOString(),
  });
  return !error;
}

export async function isAdminSession(token: string): Promise<boolean> {
  if (!supabase || token.length < 32) return false;
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", SESSION_PREFIX + hash(token))
    .maybeSingle();
  if (error || !data) return false;
  try {
    const v = JSON.parse(data.value);
    if (v.revoked_at) return false;
    if (new Date(v.expires_at).getTime() <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function revokeAdminSession(token: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", SESSION_PREFIX + hash(token))
    .maybeSingle();
  if (!data) return;
  try {
    const v = { ...JSON.parse(data.value), revoked_at: new Date().toISOString() };
    await supabase
      .from("site_settings")
      .update({ value: JSON.stringify(v), updated_at: new Date().toISOString() })
      .eq("key", SESSION_PREFIX + hash(token));
  } catch {
    /* ignore */
  }
}

/** Revoke every admin session (used on password change). */
export async function revokeAllAdminSessions(): Promise<void> {
  if (!supabase) return;
  await supabase.from("site_settings").delete().like("key", `${SESSION_PREFIX}%`);
}
