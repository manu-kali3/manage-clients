import { supabase } from "@/lib/supabase";

export interface UserRow {
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
}

export async function fetchUsersData() {
  if (!supabase) return { users: [] as UserRow[], total: 0, dbError: "Database not configured." };

  let users: UserRow[] = [];
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

    const ids = allUsers.map((u: any) => u.id);
    const profileMap = new Map<string, any>();
    const paymentPhoneMap = new Map<string, string>();

    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,phone,dob,org_type,gender,location,referral_source,secondary_phone,secondary_email,next_of_kin_name,next_of_kin_phone,next_of_kin_relationship").in("id", ids);
      for (const p of profiles ?? []) profileMap.set(p.id, p);

      const { data: payments } = await supabase.from("payments").select("user_id,phone").in("user_id", ids).not("phone", "is", null);
      for (const p of payments ?? []) {
        if (p.phone && !paymentPhoneMap.has(p.user_id)) paymentPhoneMap.set(p.user_id, p.phone);
        if (p.phone) paymentPhoneMap.set(p.user_id, p.phone);
      }
    }

    users = allUsers.map((u) => {
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
      };
    });
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { users, total: users.length, dbError };
  } catch (e: any) {
    return { users: [] as UserRow[], total: 0, dbError: e.message ?? "Failed to load users." };
  }
}

import { unstable_cache } from "next/cache";
export const loadUsersData = unstable_cache(fetchUsersData, ["admin-users"], { revalidate: 30, tags: ["admin-users"] });
