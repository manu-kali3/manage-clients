import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export const supabase =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  venue: string | null;
  image_url: string | null;
  is_online: boolean;
  is_paid: boolean;
  ticket_price_kes: number | null;
  stream_platform: string | null;
  stream_url: string | null;
  capacity: number | null;
  created_at: string;
}

export interface EventInput {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  venue?: string;
  image_url?: string;
  is_online?: boolean;
  is_paid?: boolean;
  ticket_price_kes?: number;
  stream_platform?: string;
  stream_url?: string;
  capacity?: number;
}

export const EVENT_COLUMNS =
  "id,title,description,event_date,event_time,venue,image_url,is_online,is_paid,ticket_price_kes,stream_platform,stream_url,capacity,created_at";

export const STREAM_PLATFORMS = ["youtube", "googlemeet", "tiktok"] as const;

/** Normalises an EventInput into the columns stored on the events table. */
export function eventColumnsFromInput(body: EventInput) {
  const isOnline = Boolean(body.is_online);
  const isPaid = Boolean(body.is_paid);
  const platform = body.stream_platform?.trim() ?? "";
  const price = Number(body.ticket_price_kes);
  const capacity = Number(body.capacity);

  return {
    title: body.title?.trim(),
    description: body.description?.trim() || null,
    event_date: body.event_date?.trim(),
    event_time: body.event_time?.trim() || null,
    venue: body.venue?.trim() || null,
    image_url: body.image_url?.trim() || null,
    is_online: isOnline,
    is_paid: isPaid,
    ticket_price_kes: isPaid && price > 0 ? price : null,
    stream_platform:
      (isOnline && STREAM_PLATFORMS.includes(platform as any)) ? platform : null,
    stream_url: isOnline ? body.stream_url?.trim() || null : null,
    capacity: capacity > 0 ? Math.floor(capacity) : null,
  };
}

export interface Project {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  created_at: string;
}

export interface ProjectInput {
  title: string;
  category?: string;
  description?: string;
  image_url?: string;
  project_url?: string;
}
