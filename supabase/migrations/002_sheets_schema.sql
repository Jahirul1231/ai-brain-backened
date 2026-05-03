-- Stores Google OAuth tokens per tenant
create table if not exists public.google_connections (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expiry_date   bigint,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(tenant_id)
);

-- RLS: only the owning tenant can see their connection
alter table public.google_connections enable row level security;

create policy "own_google_connection" on public.google_connections
  for all using (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid())
  );
