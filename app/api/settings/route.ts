import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { SITE_IMAGE_FIELDS } from "@/lib/site-settings";

const VALID_KEYS = new Set(SITE_IMAGE_FIELDS.map((f) => f.key));

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.key.startsWith("admin_")) continue;
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let body: { settings?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body.settings ?? {};
  const rows: { key: string; value: string; updated_at: string }[] = [];

  for (const [key, rawValue] of Object.entries(input)) {
    if (!VALID_KEYS.has(key)) continue;
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (value.length > 1000) continue;
    rows.push({ key, value, updated_at: new Date().toISOString() });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid settings were provided." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    console.error("settings upsert error:", error);
    return NextResponse.json(
      { error: "Could not save settings. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-settings", { expire: 30 });
  return NextResponse.json({ ok: true });
}
