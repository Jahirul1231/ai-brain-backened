create table if not exists public.coo_chat_history (
  id               uuid primary key default gen_random_uuid(),
  message          text not null,
  response         text not null,
  agents_consulted text[] default '{}',
  created_at       timestamptz default now()
);

create index if not exists coo_chat_history_created_idx on public.coo_chat_history(created_at desc);

alter table public.coo_chat_history enable row level security;
drop policy if exists "admin_coo" on public.coo_chat_history;
create policy "admin_coo" on public.coo_chat_history for all using (true);
