import { unstable_cache } from "next/cache";
import { supabase, EVENT_COLUMNS, type Event, type Project } from "@/lib/supabase";
import { SITE_IMAGE_FIELDS } from "@/lib/site-settings";

export interface AdminStats {
  total: number;
  upcoming: number;
  past: number;
  month: number;
}

async function fetchProjectsData() {
  let projects: Project[] = [];
  let dbError = "";

  if (supabase) {
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,category,description,image_url,project_url,created_at")
      .order("created_at", { ascending: false });

    if (!error) {
      projects = (data ?? []) as Project[];
    } else {
      dbError = error.message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  return { projects, dbError };
}

export const loadProjectsData = unstable_cache(fetchProjectsData, ["admin-projects"], {
  revalidate: 30,
  tags: ["admin-projects"],
});

async function fetchAdminData() {
  let events: Event[] = [];
  let dbError = "";

  if (supabase) {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .order("event_date", { ascending: true });

    if (!error) {
      events = (data ?? []) as Event[];
    } else {
      dbError = error.message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const stats: AdminStats = {
    total: events.length,
    upcoming: events.filter((e) => e.event_date >= today).length,
    past: events.filter((e) => e.event_date < today).length,
    month: events.filter((e) => e.event_date.startsWith(month)).length,
  };

  return { events, dbError, stats };
}

export const loadAdminData = unstable_cache(fetchAdminData, ["admin-events"], {
  revalidate: 30,
  tags: ["admin-events"],
});

async function fetchSettingsData() {
  let settings: Record<string, string> = {};
  let dbError = "";

  for (const field of SITE_IMAGE_FIELDS) {
    settings[field.key] = field.defaultValue;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key,value");

    if (!error) {
      for (const row of data ?? []) {
        if (row.key in settings) {
          settings[row.key] = row.value;
        }
      }
    } else {
      dbError = error.message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  return { settings, dbError };
}

export const loadSettingsData = unstable_cache(fetchSettingsData, ["admin-settings"], {
  revalidate: 30,
  tags: ["admin-settings"],
});
