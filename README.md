# Alivio CRM + ATS (Next.js + Supabase)

Production-oriented recruiting CRM/ATS for healthcare staffing.

## Features in this hardening pass

- Supabase email/password auth form and protected dashboard layout.
- RBAC roles: `admin`, `recruiter`, `bizdev`, `sourcer`, `readonly`.
- New multi-tenant SQL migration for core CRM/ATS entities with constraints, FK, indexes, and RLS.
- CRUD API routes for:
  - `/api/candidates`
  - `/api/contacts`
  - `/api/companies`
  - `/api/job_orders`
  - `/api/submissions`
  - `/api/interviews`
  - `/api/placements`
  - `/api/tasks`
  - `/api/activities`
- Pipeline model split into specific status fields:
  - `candidate_status`
  - `submission_status`
  - `interview_stage`
  - `offer_status`
  - `placement_status`
- Placement automation on successful submission acceptance.
- Follow-up task automation after submission creation.

## Required environment variables

Copy `.env.example` into `.env.local` and fill values:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The app validates required env variables at startup (`src/lib/env.ts`).

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Run Supabase migration against your project.

3. Start app:

```bash
npm run dev
```

4. Open `http://localhost:3000/auth/sign-in` and authenticate with Supabase Auth email/password.

## Database migration

Run:

- `supabase/migrations/202604080001_core_crm_ats.sql`

It provisions:

- `companies`, `contacts`, `candidates`
- `job_orders`, `submissions`, `interviews`, `placements`
- `tasks`, `activities`
- `candidate_licenses`, `candidate_preferences`
- RLS policies enforcing account-level tenant isolation using JWT `account_id` claim.

## Auth/JWT claims

Set these claims in Supabase Auth metadata (prefer `app_metadata`):

- `account_id` (uuid string)
- `role` (`admin` | `recruiter` | `bizdev` | `sourcer` | `readonly`)
