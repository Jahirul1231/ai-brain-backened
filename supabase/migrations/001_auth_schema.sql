-- Tenants (one per company/org)
create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  plan       text not null default 'free',
  created_at timestamptz not null default now()
);

-- User profiles linked to Supabase auth.users
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- Token balance per tenant
create table public.token_balances (
  tenant_id  uuid primary key references public.tenants(id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Immutable audit log of token usage
create table public.token_ledger (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  user_id     uuid not null references auth.users(id),
  action      text not null,
  tokens_used integer not null,
  created_at  timestamptz not null default now()
);

-- Atomic debit function (prevents balance going negative)
create or replace function public.debit_tokens(p_tenant_id uuid, p_amount integer)
returns void language plpgsql as $$
begin
  update public.token_balances
  set balance    = balance - p_amount,
      updated_at = now()
  where tenant_id = p_tenant_id
    and balance   >= p_amount;

  if not found then
    raise exception 'insufficient_tokens' using errcode = 'P0001';
  end if;
end;
$$;

-- RLS: users can only see their own tenant's data
alter table public.tenants        enable row level security;
alter table public.profiles       enable row level security;
alter table public.token_balances enable row level security;
alter table public.token_ledger   enable row level security;

create policy "tenant_isolation" on public.tenants
  for all using (
    id in (select tenant_id from public.profiles where id = auth.uid())
  );

create policy "own_profile" on public.profiles
  for all using (id = auth.uid() or tenant_id in (
    select tenant_id from public.profiles where id = auth.uid()
  ));

create policy "tenant_tokens" on public.token_balances
  for select using (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid())
  );

create policy "tenant_ledger" on public.token_ledger
  for select using (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid())
  );
