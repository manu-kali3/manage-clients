import { promisify } from "util";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const HASH_KEY = "admin_password_hash";
const SALT_KEY = "admin_password_salt";

interface StoredHash {
  hash: string;
  salt: string;
}

async function getStoredHash(): Promise<StoredHash | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .in("key", [HASH_KEY, SALT_KEY]);

  if (error || !data) return null;

  const map: Record<string, string> = {};
  for (const row of data) map[row.key] = row.value;
  if (map[HASH_KEY] && map[SALT_KEY]) {
    return { hash: map[HASH_KEY], salt: map[SALT_KEY] };
  }
  return null;
}

async function derive(password: string, saltHex: string): Promise<Buffer> {
  return scrypt(password, Buffer.from(saltHex, "hex"), 64);
}

async function makeHash(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await derive(password, salt)).toString("hex");
  return { hash, salt };
}

async function verifyStored(password: string, stored: StoredHash): Promise<boolean> {
  const actual = await derive(password, stored.salt);
  const expected = Buffer.from(stored.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Constant-time comparison against the ADMIN_PASSWORD env fallback.
 *  Hashes both sides first so the lengths are equal. */
function verifyEnvFallback(candidate: string): boolean {
  const envPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!envPassword) return false;
  const actual = Buffer.from(require("crypto").createHash("sha256").update(candidate).digest());
  const expected = Buffer.from(require("crypto").createHash("sha256").update(envPassword).digest());
  return timingSafeEqual(actual, expected);
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const stored = await getStoredHash();
  if (stored) return verifyStored(candidate, stored);
  if (process.env.NODE_ENV === "production") {
    console.error("admin password not initialized: set via /api/password");
    return false;
  }
  return verifyEnvFallback(candidate);
}

/** Persists a new password hash. Returns false if the database is unavailable. */
export async function storePassword(newPassword: string): Promise<boolean> {
  if (!supabase) return false;
  const { hash, salt } = await makeHash(newPassword);
  const now = new Date().toISOString();
  const rows = [
    { key: HASH_KEY, value: hash, updated_at: now },
    { key: SALT_KEY, value: salt, updated_at: now },
  ];
  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });
  return !error;
}
