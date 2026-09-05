import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase, eventColumnsFromInput, type EventInput } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { safeUrl } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await params;

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

  const { error } = await supabase
    .from("events")
    .update(eventColumnsFromInput(body))
    .eq("id", id);

  if (error) {
    console.error("events update error:", error);
    return NextResponse.json(
      { error: "Could not update the event. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-events", { expire: 30 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { id } = await params;

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("admin-events", { expire: 30 });
  return NextResponse.json({ ok: true });
}
