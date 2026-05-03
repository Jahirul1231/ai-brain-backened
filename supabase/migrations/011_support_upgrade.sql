alter table public.support_tickets
  add column if not exists resolution_note text,
  add column if not exists resolved_by     text;

-- Index for fast search by email
create index if not exists support_tickets_email_idx on public.support_tickets(from_email);
