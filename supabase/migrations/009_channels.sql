-- Agent channel network (Slack-style)

create table if not exists public.agent_channels (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  icon        text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

create table if not exists public.agent_messages (
  id           uuid primary key default gen_random_uuid(),
  channel_slug text not null references public.agent_channels(slug) on delete cascade,
  sender_type  text not null check (sender_type in ('agent', 'founder', 'system')),
  sender_name  text not null,
  content      text not null,
  meta         jsonb default '{}',
  created_at   timestamptz default now()
);

create index if not exists agent_messages_channel_idx
  on public.agent_messages(channel_slug, created_at desc);

create table if not exists public.channel_reads (
  user_id      uuid not null,
  channel_slug text not null references public.agent_channels(slug) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_slug)
);

-- RLS (admin-only, service key bypasses anyway)
alter table public.agent_channels  enable row level security;
alter table public.agent_messages  enable row level security;
alter table public.channel_reads   enable row level security;

drop policy if exists "admin_channels"  on public.agent_channels;
drop policy if exists "admin_messages"  on public.agent_messages;
drop policy if exists "admin_reads"     on public.channel_reads;

create policy "admin_channels"  on public.agent_channels  for all using (true);
create policy "admin_messages"  on public.agent_messages  for all using (true);
create policy "admin_reads"     on public.channel_reads   for all using (true);

-- Seed channels
insert into public.agent_channels (slug, name, description, icon, sort_order) values
  ('general',           'General',           'All agents — cross-team discussions and founder broadcasts', '◎', 0),
  ('onboarding',        'Onboarding',        'Client onboarding updates, stuck alerts, and step completions', '◉', 1),
  ('support',           'Support',           'Support ticket activity, AI drafts, and escalations',         '◇', 2),
  ('ops',               'OPS',               'Operational alerts, health checks, and system events',        '⚡', 3),
  ('tech-issues',       'Tech Issues',       'Errors, API failures, auth problems, and technical incidents','⚠', 4),
  ('data-verification', 'Data Verification', 'Data quality checks, anomalies found, and stale sheet alerts','▣', 5),
  ('data-analyst',      'Data Analyst',      'Analysis summaries, weekly insights, and trend reports',      '⬡', 6)
on conflict (slug) do nothing;
