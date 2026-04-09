-- alivio-recruiting-automation-kit starter schema
-- Intended as a baseline for independent recruiters and boutique staffing firms.

create extension if not exists pgcrypto;

create type pipeline_stage as enum (
  'new_lead',
  'sourced',
  'screening',
  'submitted',
  'interview',
  'offer',
  'placed',
  'rejected',
  'on_hold'
);

create type submission_status as enum (
  'draft',
  'sent_to_client',
  'client_review',
  'interviewing',
  'offer',
  'accepted',
  'declined',
  'closed'
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  account_owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  location text,
  employment_type text,
  salary_min integer,
  salary_max integer,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  stage pipeline_stage not null default 'new_lead',
  current_title text,
  source text,
  consent_status text default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_order_id uuid not null references job_orders(id) on delete cascade,
  recruiter_owner text,
  status submission_status not null default 'draft',
  submitted_at timestamptz,
  client_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id, job_order_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  activity_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_candidates_stage on candidates(stage);
create index if not exists idx_submissions_status on submissions(status);
create index if not exists idx_submissions_job on submissions(job_order_id);
create index if not exists idx_activities_entity on activities(entity_type, entity_id, created_at desc);
