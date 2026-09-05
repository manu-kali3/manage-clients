import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase, EVENT_COLUMNS, eventColumnsFromInput, type EventInput } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { capped, safeUrl } from "@/lib/validation";
import { clientIp, rateLimit, verifyCsrf } from "@/lib/rate-limit";

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
    .from("events")
    .select(EVENT_COLUMNS)
    .order("event_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const limiter = rateLimit(`admin:events:${clientIp(request)}`, 30, 10 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  let body: EventInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = body.title?.trim();
  const event_date = body.event_date?.trim();

  if (!title || !event_date) {
    return NextResponse.json(
      { error: "Title and date are required." },
      { status: 400 }
    );
  }
  if (title.length > 200 || event_date.length > 64) {
    return NextResponse.json({ error: "Title is too long." }, { status: 400 });
  }
  if ((body.description?.trim().length ?? 0) > 5000) {
    return NextResponse.json({ error: "Description is too long." }, { status: 400 });
  }
  if (body.stream_url && body.stream_url.trim() && !safeUrl(body.stream_url)) {
    return NextResponse.json(
      { error: "Stream link must start with http:// or https://." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("events")
    .insert([eventColumnsFromInput(body)])
    .select()
    .single();

  if (error) {
    console.error("events insert error:", error);
    return NextResponse.json(
      { error: "Could not create the event. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-events", { expire: 30 });
  return NextResponse.json({ event: data }, { status: 201 });
}
