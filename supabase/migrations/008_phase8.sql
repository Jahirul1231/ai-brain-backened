-- ── Phase 8: Multi-sheet, Trial system, Client CRM, Support tickets ──────────

-- Extend profiles with client contact details
alter table public.profiles add column if not exists full_name  text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists city       text;
alter table public.profiles add column if not exists avatar_url text;

-- Extend tenants with trial + account status
alter table public.tenants add column if not exists trial_started_at  timestamptz;
alter table public.tenants add column if not exists trial_ends_at     timestamptz;
alter table public.tenants add column if not exists trial_active      boolean default false;
alter table public.tenants add column if not exists account_status    text not null default 'active';
alter table public.tenants add column if not exists max_sheets        int  not null default 4;
alter table public.tenants add column if not exists notes             text; -- founder notes on this client

-- Sheet connections (up to max_sheets per tenant)
create table if not exists public.sheet_connections (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  spreadsheet_id   text not null,
  spreadsheet_name text,
  spreadsheet_url  text,
  tab_count        int  default 0,
  is_primary       boolean default false,
  last_accessed_at timestamptz,
  connected_at     timestamptz not null default now(),
  unique(tenant_id, spreadsheet_id)
);

create index if not exists sheet_connections_tenant_idx on public.sheet_connections(tenant_id);

alter table public.sheet_connections enable row level security;
drop policy if exists "own_sheet_connections" on public.sheet_connections;
create policy "own_sheet_connections" on public.sheet_connections
  for all using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- Support tickets
create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_number   text unique,
  tenant_id       uuid references public.tenants(id) on delete set null,
  user_id         uuid references auth.users(id)    on delete set null,
  from_email      text not null,
  from_name       text,
  subject         text not null,
  body            text not null,
  status          text not null default 'open',      -- open | in_progress | resolved | closed
  priority        text not null default 'normal',    -- low | normal | high | urgent
  assigned_to     text,
  ai_draft        text,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists support_tickets_status_idx  on public.support_tickets(status, created_at desc);
create index if not exists support_tickets_tenant_idx  on public.support_tickets(tenant_id);

alter table public.support_tickets enable row level security;
drop policy if exists "own_tickets" on public.support_tickets;
create policy "own_tickets" on public.support_tickets
  for all using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- Ticket replies
create table if not exists public.ticket_messages (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.support_tickets(id) on delete cascade,
  from_email      text not null,
  body            text not null,
  is_staff_reply  boolean default false,
  created_at      timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;
drop policy if exists "own_ticket_messages" on public.ticket_messages;
create policy "own_ticket_messages" on public.ticket_messages
  for all using (
    ticket_id in (
      select id from public.support_tickets
      where tenant_id in (select tenant_id from public.profiles where id = auth.uid())
    )
  );

-- Sequence for ticket numbers
create sequence if not exists support_ticket_seq start 1000;

-- Function to auto-assign ticket number
create or replace function public.assign_ticket_number()
returns trigger language plpgsql as $$
begin
  new.ticket_number := 'TKT-' || lpad(nextval('support_ticket_seq')::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists trg_assign_ticket_number on public.support_tickets;
create trigger trg_assign_ticket_number
  before insert on public.support_tickets
  for each row when (new.ticket_number is null)
  execute function public.assign_ticket_number();
