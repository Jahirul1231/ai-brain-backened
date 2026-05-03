create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,  -- new_tenant | new_issue | trial_expiring | low_tokens | system_alert | new_intel
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_read_idx on public.notifications(read, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "admin_notifications" on public.notifications;
create policy "admin_notifications" on public.notifications for all using (true);

create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  action     text not null,
  entity     text,
  entity_id  text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on public.activity_log(created_at desc);

alter table public.activity_log enable row level security;
drop policy if exists "admin_activity" on public.activity_log;
create policy "admin_activity" on public.activity_log for all using (true);
