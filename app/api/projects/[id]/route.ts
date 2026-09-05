import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase, type ProjectInput } from "@/lib/supabase";
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

  let body: ProjectInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }
  if (title.length > 200 || (body.description?.trim().length ?? 0) > 5000) {
    return NextResponse.json({ error: "Title or description is too long." }, { status: 400 });
  }
  if (body.project_url && body.project_url.trim() && !safeUrl(body.project_url)) {
    return NextResponse.json(
      { error: "Project link must start with http:// or https://." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title,
      category: body.category?.trim() || null,
      description: body.description?.trim() || null,
      image_url: safeUrl(body.image_url) ?? null,
      project_url: safeUrl(body.project_url) ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("projects update error:", error);
    return NextResponse.json(
      { error: "Could not update the project. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-projects", { expire: 30 });
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

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("projects delete error:", error);
    return NextResponse.json(
      { error: "Could not delete the project. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-projects", { expire: 30 });
  return NextResponse.json({ ok: true });
}
