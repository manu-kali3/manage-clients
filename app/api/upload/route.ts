import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { clientIp, rateLimit, verifyCsrf } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;
// Raster formats only — SVG is rejected: it can smuggle scripts into the site.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** File signature checks so a renamed payload cannot sneak through. */
function sniffMime(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString("latin1") === "GIF87a" ||
      buffer.subarray(0, 6).toString("latin1") === "GIF89a")
  ) {
    return "image/gif";
  }
  return null;
}

export async function POST(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const limiter = rateLimit(`admin:upload:${clientIp(request)}`, 20, 10 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many uploads." }, { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 500 }
    );
  }

  // Reject oversized bodies before parsing them.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 0 && contentLength > MAX_SIZE + 64 * 1024) {
    return NextResponse.json({ error: "Image is larger than 5MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WebP or GIF images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image is larger than 5MB." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  if (!sniffed || sniffed !== file.type) {
    return NextResponse.json(
      { error: "The file contents do not match its declared type." },
      { status: 400 }
    );
  }

  const safeName = (file.name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  const path = `images/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("site-images")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
