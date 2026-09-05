import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

export interface ServiceCommentRow {
  id: string;
  booking_id: string;
  user_id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
}

export interface ServiceBookingRow {
  id: string;
  user_id: string;
  service: string;
  description: string | null;
  status: string;
  amount: number | null;
  project_url: string | null;
  created_at: string;
  comments: ServiceCommentRow[];
}

export interface ClientRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  paymentPhone: string | null;
  created_at: string;
  email_confirmed: boolean;
  last_sign_in: string | null;
  provider: string;
  dob: string | null;
  org_type: string | null;
  gender: string | null;
  location: string | null;
  referral_source: string | null;
  secondary_phone: string | null;
  secondary_email: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  bookings: ServiceBookingRow[];
}

export async function fetchClientsData() {
  if (!supabase) return { clients: [] as ClientRow[], total: 0, dbError: "Database not configured." };
  let dbError = "";
  try {
    let page = 1;
    const perPage = 1000;
    const allUsers: any[] = [];
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        dbError = error.message;
        break;
      }
      const batch = data.users ?? [];
      allUsers.push(...batch);
      if (batch.length < perPage) break;
      page++;
    }
    const ids = allUsers.map((u) => u.id);
    const profileMap = new Map<string, any>();
    const paymentPhoneMap = new Map<string, string>();
    let bookingsByUser = new Map<string, ServiceBookingRow[]>();

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,phone,dob,org_type,gender,location,referral_source,secondary_phone,secondary_email,next_of_kin_name,next_of_kin_phone,next_of_kin_relationship")
        .in("id", ids);
      for (const p of profiles ?? []) profileMap.set(p.id, p);

      const { data: payments } = await supabase.from("payments").select("user_id,phone").in("user_id", ids).not("phone", "is", null);
      for (const p of payments ?? []) {
        if (p.phone) paymentPhoneMap.set(p.user_id, p.phone);
      }

      const { data: bookings } = await supabase
        .from("service_bookings")
        .select("id,user_id,service,description,status,amount,project_url,created_at")
        .in("user_id", ids)
        .order("created_at", { ascending: false });

      const bookingRows: ServiceBookingRow[] = (bookings ?? []).map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        service: b.service,
        description: b.description,
        status: b.status,
        amount: b.amount != null ? Number(b.amount) : null,
        project_url: b.project_url ?? null,
        created_at: b.created_at,
        comments: [],
      }));

      const bookingIds = bookingRows.map((b) => b.id);
      let commentsByBooking = new Map<string, ServiceCommentRow[]>();
      if (bookingIds.length > 0) {
        const { data: comments } = await supabase
          .from("service_comments")
          .select("id,booking_id,user_id,body,is_admin,created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: true });
        for (const c of (comments ?? []) as ServiceCommentRow[]) {
          const arr = commentsByBooking.get(c.booking_id) ?? [];
          arr.push(c);
          commentsByBooking.set(c.booking_id, arr);
        }
      }
      for (const b of bookingRows) {
        b.comments = commentsByBooking.get(b.id) ?? [];
        const arr = bookingsByUser.get(b.user_id) ?? [];
        arr.push(b);
        bookingsByUser.set(b.user_id, arr);
      }
    }

    const clients: ClientRow[] = allUsers.map((u) => {
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        name: profile?.full_name ?? (u.user_metadata?.full_name as string) ?? null,
        phone: profile?.phone ?? null,
        paymentPhone: paymentPhoneMap.get(u.id) ?? (u.phone || null) ?? null,
        created_at: u.created_at,
        email_confirmed: !!u.email_confirmed_at,
        last_sign_in: u.last_sign_in_at ?? null,
        provider: u.app_metadata?.provider ?? "email",
        dob: profile?.dob ?? null,
        org_type: profile?.org_type ?? null,
        gender: profile?.gender ?? null,
        location: profile?.location ?? null,
        referral_source: profile?.referral_source ?? null,
        secondary_phone: profile?.secondary_phone ?? null,
        secondary_email: profile?.secondary_email ?? null,
        next_of_kin_name: profile?.next_of_kin_name ?? null,
        next_of_kin_phone: profile?.next_of_kin_phone ?? null,
        next_of_kin_relationship: profile?.next_of_kin_relationship ?? null,
        bookings: bookingsByUser.get(u.id) ?? [],
      };
    });
    clients.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { clients, total: clients.length, dbError };
  } catch (e: any) {
    return { clients: [] as ClientRow[], total: 0, dbError: e.message ?? "Failed to load clients." };
  }
}

export const loadClientsData = unstable_cache(fetchClientsData, ["admin-clients"], { revalidate: 30, tags: ["admin-clients"] });
