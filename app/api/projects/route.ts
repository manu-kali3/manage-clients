import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabase, type ProjectInput } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { safeUrl } from "@/lib/validation";
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
    .from("projects")
    .select("id,title,category,description,image_url,project_url,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const limiter = rateLimit(`admin:projects:${clientIp(request)}`, 30, 10 * 60 * 1000);
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

  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        title,
        category: body.category?.trim() || null,
        description: body.description?.trim() || null,
        image_url: safeUrl(body.image_url) ?? null,
        project_url: safeUrl(body.project_url) ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("projects insert error:", error);
    return NextResponse.json(
      { error: "Could not create the project. Please try again." },
      { status: 500 }
    );
  }

  revalidateTag("admin-projects", { expire: 30 });
  return NextResponse.json({ project: data }, { status: 201 });
}
