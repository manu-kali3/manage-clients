# Brevan Softwares — Manage Clients (Admin Portal for brevan-client)

Dedicated admin portal for the brevan-client service bookings platform. Lists every client with extended profile data, their service_bookings, and threaded service_comments; admin replies as `is_admin=true`. Keep events/projects but primary focus is **Clients**.

- **Hosted separately**: port `3004`, separate Vercel project from `manage-brevan`
- **Source**: copied from `manage-brevan`

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Supabase** (Postgres) — shared project `hhplmvpwlikifflwczgx.supabase.co`
- **Resend** — campaign emails
- Cookie-based admin session (`brevan_admin`)

## Getting Started

```bash
npm install
copy .env.example .env.local   # Windows, or: cp .env.example .env.local
npm run dev                    # http://localhost:3004
```

Node 18.18+ / 20+ is required (Next.js 16).

## Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | brevan-client site URL (defaults to `https://brevannew.vercel.app`). |
| `SUPABASE_URL` | Supabase project URL (`https://<project>.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — **server only**. |
| `ADMIN_PASSWORD` | Login password (`/login`). |
| `ADMIN_TOKEN` | Value the session cookie (`brevan_admin`) must equal. |
| `RESEND_API_KEY` | Resend key for campaign emails. |
| `EMAIL_FROM` | Sender address for emails. |

`.env*` is gitignored — never commit real keys.

## Profile Extended Fields (brevan-client)

`profiles` now includes: `dob`, `org_type`, `gender`, `location`, `referral_source`, `secondary_phone`, `secondary_email`, `next_of_kin_name`, `next_of_kin_phone`, `next_of_kin_relationship` plus `full_name`, `phone`.

Run once in Supabase SQL editor if columns missing:

```sql
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists org_type text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists referral_source text;
alter table public.profiles add column if not exists secondary_phone text;
alter table public.profiles add column if not exists secondary_email text;
alter table public.profiles add column if not exists next_of_kin_name text;
alter table public.profiles add column if not exists next_of_kin_phone text;
alter table public.profiles add column if not exists next_of_kin_relationship text;
alter table public.service_bookings add column if not exists project_url text;
alter table public.service_bookings add column if not exists amount numeric default 0;
```

See also `brevan-client/supabase/schema.sql` for `service_bookings` + `service_comments`.

## Key Areas

- `/` — dashboard (events overview, kept)
- `/clients` — **primary**: clients with bookings + comment threads, admin reply, profile edit, booking status/amount/project_url edit
- `/users` — users table with all extended profile fields + edit modal (same data as Clients, table view)
- `/events`, `/events/[id]` — event CRUD (kept)
- `/projects`, `/projects/[id]` — project CRUD (kept)
- `/bookings` — event ticket bookings (payments)
- `/settings` — site settings / site images
- `/subscribers` — newsletter subscribers
- `/scan` — QR check-in

## API Routes (clients)

- `POST /api/clients/reply` — `{ bookingId, body }` inserts into `service_comments` with `is_admin=true` (uses booking's `user_id` for FK)
- `POST /api/clients/update-profile` — `{ userId, fields }` upserts `profiles` whitelist fields
- `POST /api/clients/update-booking` — `{ bookingId, status, amount, project_url }` updates `service_bookings`

All require `brevan_admin` cookie, revalidate `admin-clients` + `admin-users`.

## Data Layer

- `lib/clients-data.ts` — `fetchClientsData()` paginates `auth.admin.listUsers`, joins `profiles` (extended), `service_bookings`, `service_comments`; cached `unstable_cache` 30s tag `admin-clients`
- `lib/users-data.ts` — extended to include same profile columns

## Caching

- `lib/clients-data.ts` / `lib/users-data.ts` / `lib/booking-data.ts` / `lib/admin-data.ts` wrap queries in `unstable_cache` (30s).
- Mutation API routes call `revalidateTag("admin-clients", { expire: 30 })` etc.

## Build & Production

```bash
npm run build
npm run start     # serves on http://localhost:3004 (port 3004)
```

## Deploy

- Separate Vercel project from `manage-brevan`, set port 3004 env, set Supabase env vars in project settings.
- Original: https://github.com/manu-kali3/manage-brevan ; this portal deploys from its own repo/project.
