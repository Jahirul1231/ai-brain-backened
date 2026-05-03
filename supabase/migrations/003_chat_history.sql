-- Chat history per tenant
create table if not exists public.chat_history (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  message      text not null,
  response     text not null,
  tools_used   text[] default '{}',
  tokens_used  int  not null default 1,
  created_at   timestamptz not null default now()
);

create index if not exists chat_history_tenant_idx on public.chat_history(tenant_id, created_at desc);

alter table public.chat_history enable row level security;

drop policy if exists "own_chat_history" on public.chat_history;
create policy "own_chat_history" on public.chat_history
  for all using (
    tenant_id in (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );
