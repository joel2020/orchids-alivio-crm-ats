-- Core CRM/ATS hardening migration
create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  region text,
  status text not null default 'prospect' check (status in ('prospect','active','dormant','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, name)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  title text,
  is_decision_maker boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, email)
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  source text,
  candidate_status text not null default 'new' check (candidate_status in ('new','screening','qualified','submitted','interviewing','offer','placed','rejected','nurture')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_licenses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  license_type text not null,
  state text,
  expires_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  preferred_specialties text[] not null default '{}',
  preferred_states text[] not null default '{}',
  shift_types text[] not null default '{}',
  pay_rate_min numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id)
);

create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text,
  location text,
  openings integer not null default 1 check (openings > 0),
  fee_percent numeric check (fee_percent >= 0 and fee_percent <= 100),
  status text not null default 'open' check (status in ('intake','open','on_hold','filled','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  submission_status text not null default 'draft' check (submission_status in ('draft','submitted','client_review','shortlisted','rejected','offer','accepted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id, job_order_id)
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  interview_stage text not null check (interview_stage in ('phone_screen','technical','manager','onsite','final')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','completed','canceled','no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade unique,
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  start_date date not null,
  guarantee_end_date date,
  fee numeric not null check (fee >= 0),
  revenue numeric not null check (revenue >= 0),
  offer_status text not null default 'accepted' check (offer_status in ('none','extended','accepted','declined','rescinded')),
  placement_status text not null default 'pending' check (placement_status in ('pending','active','guaranteed','completed','falloff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  title text not null,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  assignee_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  type text not null,
  subject text,
  body text,
  source text not null default 'manual' check (source in ('manual','system','instantly','n8n')),
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_account on public.companies(account_id);
create index if not exists idx_contacts_account_company on public.contacts(account_id, company_id);
create index if not exists idx_candidates_account_status on public.candidates(account_id, candidate_status);
create index if not exists idx_job_orders_account_company on public.job_orders(account_id, company_id);
create index if not exists idx_submissions_account_job on public.submissions(account_id, job_order_id);
create index if not exists idx_interviews_account_submission on public.interviews(account_id, submission_id);
create index if not exists idx_placements_account_start on public.placements(account_id, start_date desc);
create index if not exists idx_tasks_account_due on public.tasks(account_id, due_date);
create index if not exists idx_activities_account_created on public.activities(account_id, created_at desc);

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_licenses enable row level security;
alter table public.candidate_preferences enable row level security;
alter table public.job_orders enable row level security;
alter table public.submissions enable row level security;
alter table public.interviews enable row level security;
alter table public.placements enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

create or replace function public.current_account_id() returns uuid language sql stable as $$
  select coalesce(
    nullif(auth.jwt() ->> 'account_id', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'account_id', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'account_id', '')
  )::uuid
$$;

create or replace function public.current_role() returns text language sql stable as $$
  select coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    'readonly'
  )
$$;

do $$
declare t text;
begin
  foreach t in array array['companies','contacts','candidates','candidate_licenses','candidate_preferences','job_orders','submissions','interviews','placements','tasks','activities']
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_modify on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select using (account_id = public.current_account_id())', t, t);
    execute format('create policy %I_modify on public.%I for all using (account_id = public.current_account_id() and public.current_role() in (''admin'',''recruiter'',''bizdev'',''sourcer'')) with check (account_id = public.current_account_id())', t, t);
  end loop;
end $$;
