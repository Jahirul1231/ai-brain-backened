-- ── Phase 8: Agent Network ───────────────────────────────────────────────────
create table if not exists public.agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null,
  description text,
  status      text not null default 'idle',   -- idle | working | offline
  last_task   text,
  tasks_done  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.agents (name, role, description) values
  ('Atlas',   'CEO',              'Strategic oversight, high-level decisions, company direction'),
  ('Iris',    'CTO',              'Tech architecture, engineering decisions, system health'),
  ('Nova',    'HR',               'Hiring, onboarding, culture, team satisfaction'),
  ('Rex',     'Sales',            'Lead generation, demos, closing deals, revenue growth'),
  ('Lyra',    'Marketing',        'Campaigns, brand, social media, growth hacking'),
  ('Scout',   'SEO',              'Search rankings, keyword strategy, content optimisation'),
  ('Quill',   'Content Writer',   'Blog posts, copy, emails, scripts, documentation'),
  ('Aria',    'Support',          'Customer support tickets, satisfaction, escalations'),
  ('Orbit',   'Onboarding',       'New customer setup, walkthroughs, activation milestones'),
  ('Sigma',   'Director',         'Department coordination, cross-team execution'),
  ('Maven',   'VP Growth',        'Product-led growth, retention, upsell strategy')
on conflict do nothing;

-- ── Phase 9: Client Issues ────────────────────────────────────────────────────
create table if not exists public.client_issues (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'open',    -- open | in_progress | resolved | closed
  priority     text not null default 'medium',  -- low | medium | high | critical
  assigned_to  uuid references public.agents(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists client_issues_status_idx on public.client_issues(status, priority);

alter table public.client_issues enable row level security;
drop policy if exists "admin_issues" on public.client_issues;
create policy "admin_issues" on public.client_issues for all using (true);

-- ── Phase 10: Customer Onboarding ────────────────────────────────────────────
create table if not exists public.onboarding (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid references public.tenants(id) on delete cascade,
  contact_name   text,
  contact_email  text,
  stage          text not null default 'signed_up',  -- signed_up | activated | connected | retained
  health_score   int  not null default 0 check (health_score between 0 and 100),
  assigned_to    uuid references public.agents(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.onboarding enable row level security;
drop policy if exists "admin_onboarding" on public.onboarding;
create policy "admin_onboarding" on public.onboarding for all using (true);

-- ── Phase 11: Trials & Sales ──────────────────────────────────────────────────
create table if not exists public.trials (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null unique,
  company        text,
  status         text not null default 'trial',  -- trial | converted | churned | expired
  trial_ends_at  timestamptz,
  converted_at   timestamptz,
  emails_sent    int  not null default 0,
  last_email_at  timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists trials_status_idx on public.trials(status, trial_ends_at);

alter table public.trials enable row level security;
drop policy if exists "admin_trials" on public.trials;
create policy "admin_trials" on public.trials for all using (true);

-- ── Phase 12: Finance ─────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,                    -- revenue | expense | refund
  category    text not null,                    -- saas | hosting | marketing | salary | tools | other
  amount      numeric(12,2) not null,
  currency    text not null default 'USD',
  description text not null,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists transactions_date_idx on public.transactions(date desc);

alter table public.transactions enable row level security;
drop policy if exists "admin_transactions" on public.transactions;
create policy "admin_transactions" on public.transactions for all using (true);

-- ── Phase 13: Intelligence Feed ───────────────────────────────────────────────
create table if not exists public.intel_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text,
  url         text,
  source      text,
  category    text not null default 'ai',       -- ai | competitor | market | tools
  relevance   int  not null default 5 check (relevance between 1 and 10),
  read        boolean not null default false,
  published_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists intel_items_cat_idx on public.intel_items(category, created_at desc);

alter table public.intel_items enable row level security;
drop policy if exists "admin_intel" on public.intel_items;
create policy "admin_intel" on public.intel_items for all using (true);
