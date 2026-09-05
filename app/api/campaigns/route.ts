import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { loadCampaignsData } from "@/lib/booking-data";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Brevan Softwares <onboarding@resend.dev>";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { campaigns, dbError } = await loadCampaignsData();
  if (dbError) {
    return NextResponse.json({ error: dbError }, { status: 500 });
  }
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const limiter = rateLimit(`campaign:${clientIp(request)}`, 2, 10 * 60 * 1000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Too many campaigns sent. Try again later." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
  }
  if (!resend) {
    return NextResponse.json({ error: "Email is not configured." }, { status: 503 });
  }

  let body: { subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const subject = body.subject?.trim();
  const text = body.body?.trim();
  if (!subject || !text) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }
  if (subject.length > 200 || text.length > 50000) {
    return NextResponse.json({ error: "Subject or message is too long." }, { status: 400 });
  }

  const { data: subs, error: subErr } = await supabase
    .from("subscribers")
    .select("email,name")
    .is("unsubscribed_at", null);

  if (subErr) {
    console.error("campaign subscribers error:", subErr);
    return NextResponse.json({ error: "Could not load subscribers." }, { status: 500 });
  }

  const recipients = (subs ?? []).filter((s) => /^[^ @]+@[^ @]+$/.test(s.email));
  const campaign = {
    subject,
    body: text,
    recipient_count: recipients.length,
    sent_count: 0,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("campaigns")
    .insert(campaign)
    .select()
    .single();
  if (insErr) {
    console.error("campaign insert error:", insErr);
    return NextResponse.json({ error: "Could not start the campaign." }, { status: 500 });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ campaign: inserted, sent: 0 });
  }

  const BATCH = 50;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const { error } = await resend.batch.send(
      batch.map((r) => ({
        from: FROM,
        to: [r.email],
        subject,
        text: `Hi ${r.name ? r.name.split(" ")[0] : "there"},\n\n${text}\n\n--\nBrevan Softwares\nYou are receiving this because you subscribed for updates. To stop receiving these emails, contact brevansoftwares@gmail.com.`,
      }))
    );
    if (!error) sent += batch.length;
    else console.error("campaign batch error:", error);
  }

  await supabase.from("campaigns").update({ sent_count: sent }).eq("id", inserted.id);

  return NextResponse.json({ campaign: { ...inserted, sent_count: sent }, sent });
}
