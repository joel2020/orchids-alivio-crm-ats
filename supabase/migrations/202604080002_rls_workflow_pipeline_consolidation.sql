-- Phase 3: explicit RLS policies, workflow relationship hardening, canonical submissions pipeline

-- 1) Workflow relationship hardening
alter table if exists public.opportunities
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists company_id uuid,
  add column if not exists contact_id uuid,
  add column if not exists job_order_id uuid,
  add column if not exists stage text default 'lead',
  add column if not exists value numeric,
  add column if not exists owner_user_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.opportunities
  add constraint opportunities_company_fk foreign key (company_id) references public.companies(id) on delete set null,
  add constraint opportunities_contact_fk foreign key (contact_id) references public.contacts(id) on delete set null,
  add constraint opportunities_job_order_fk foreign key (job_order_id) references public.job_orders(id) on delete set null;

alter table if exists public.job_orders
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

alter table if exists public.submissions
  add column if not exists offer_status text default 'none' check (offer_status in ('none','extended','accepted','declined','rescinded')),
  add column if not exists interview_stage text,
  add column if not exists placement_status text default 'pending' check (placement_status in ('pending','active','guaranteed','completed','falloff'));

alter table if exists public.placements
  alter column submission_id set not null,
  alter column candidate_id set not null,
  alter column company_id set not null,
  alter column job_order_id set not null,
  alter column fee set not null,
  alter column revenue set not null;

alter table if exists public.placements
  add constraint placements_revenue_fee_non_negative check (fee >= 0 and revenue >= 0);

create unique index if not exists idx_placements_submission_unique on public.placements(submission_id);

-- 2) Canonical pipeline model = submissions.
-- Keep legacy applications table untouched; route layer maps to submissions.
comment on table public.submissions is 'Canonical recruiting pipeline table. applications API is compatibility facade.';

-- 3) Full explicit RLS
create or replace function public.current_account_id() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'account_id', '')::uuid
$$;

create or replace function public.current_role() returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'readonly')
$$;

do $$
declare t text;
declare tables text[] := array[
  'companies','contacts','candidates','candidate_licenses','candidate_preferences',
  'job_orders','submissions','interviews','placements','tasks','activities','opportunities'
];
begin
  foreach t in array tables loop
    execute format('alter table if exists public.%I enable row level security', t);

    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('drop policy if exists %I_modify on public.%I', t, t);

    execute format('create policy %I_select on public.%I for select using (account_id = public.current_account_id())', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (account_id = public.current_account_id() and public.current_role() in (''admin'',''recruiter'',''bizdev'',''sourcer''))', t, t);
    execute format('create policy %I_update on public.%I for update using (account_id = public.current_account_id() and public.current_role() in (''admin'',''recruiter'',''bizdev'',''sourcer'')) with check (account_id = public.current_account_id())', t, t);
    execute format('create policy %I_delete on public.%I for delete using (account_id = public.current_account_id() and public.current_role() in (''admin'',''recruiter''))', t, t);
  end loop;
end $$;
