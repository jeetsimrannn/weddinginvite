-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  guest_count integer not null default 1 check (guest_count > 0),
  attendance text not null default 'yes' check (attendance in ('yes','no','maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rsvps_set_updated_at on public.rsvps;
create trigger rsvps_set_updated_at
before update on public.rsvps
for each row
execute function public.set_updated_at();

alter table public.rsvps enable row level security;
alter table public.updates enable row level security;

-- NOTE: these policies allow public access via anon key.
-- Suitable for quick MVP. For stronger security, add proper Auth-based policies.
create policy "public read rsvps"
on public.rsvps for select
to anon
using (true);

create policy "public write rsvps"
on public.rsvps for insert
to anon
with check (true);

create policy "public update rsvps"
on public.rsvps for update
to anon
using (true)
with check (true);

create policy "public delete rsvps"
on public.rsvps for delete
to anon
using (true);

create policy "public read updates"
on public.updates for select
to anon
using (true);

create policy "public write updates"
on public.updates for insert
to anon
with check (true);
