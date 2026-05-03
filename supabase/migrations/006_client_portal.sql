-- Add business_slug to tenants (for subdomain automation)
alter table public.tenants add column if not exists business_slug text unique;
alter table public.tenants add column if not exists industry text;
alter table public.tenants add column if not exists subdomain_active boolean default false;

-- Update existing tenants with slugs
update public.tenants set business_slug = lower(regexp_replace(name, '[^a-zA-Z0-9]', '-', 'g')) where business_slug is null;

-- Onboarding progress per tenant
create table if not exists public.onboarding_progress (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null unique references public.tenants(id) on delete cascade,
  step         int  not null default 1,           -- 1-5
  completed    boolean not null default false,
  business_name text,
  industry     text,
  use_case     text,
  sheets_shared boolean default false,
  consent_given boolean default false,
  dashboard_generated boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.onboarding_progress enable row level security;
drop policy if exists "own_onboarding_progress" on public.onboarding_progress;
create policy "own_onboarding_progress" on public.onboarding_progress
  for all using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- Data consents (legal)
create table if not exists public.data_consents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     text not null default '1.0',
  ip_address  text,
  user_agent  text,
  consented_at timestamptz not null default now()
);

create index if not exists data_consents_tenant_idx on public.data_consents(tenant_id);

alter table public.data_consents enable row level security;
drop policy if exists "own_consent" on public.data_consents;
create policy "own_consent" on public.data_consents
  for all using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- Client reports
create table if not exists public.client_reports (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  prompt       text not null,
  format       text not null default 'table',    -- table | sheet | pdf
  status       text not null default 'pending',  -- pending | generating | ready | failed
  result       text,                              -- inline result or sheet URL
  sheet_url    text,
  delivered_to text[],                            -- email, slack, telegram
  created_at   timestamptz not null default now()
);

create index if not exists client_reports_tenant_idx on public.client_reports(tenant_id, created_at desc);

alter table public.client_reports enable row level security;
drop policy if exists "own_reports" on public.client_reports;
create policy "own_reports" on public.client_reports
  for all using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- Data updates feed (auto-generated insights per tenant)
create table if not exists public.data_updates (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  headline    text not null,
  summary     text,
  change_type text default 'info',   -- increase | decrease | alert | info
  metric      text,
  value_now   text,
  value_prev  text,
  sheet_ref   text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists data_updates_tenant_idx on public.data_updates(tenant_id, created_at desc);

alter table public.data_updates enable row level security;
drop policy if exists "own_updates" on public.data_updates;
create policy "own_updates" on public.data_updates
  for all using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));
