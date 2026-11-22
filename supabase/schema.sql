-- skip-d · cloud sync schema
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again.

-- One row per user. The whole app state is stored as JSON.
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_state_size check (pg_column_size(data) < 512000)
);

alter table public.user_state enable row level security;

-- Only signed-in users can touch the table, and only their own row.
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;

drop policy if exists "read own state"   on public.user_state;
drop policy if exists "insert own state" on public.user_state;
drop policy if exists "update own state" on public.user_state;
drop policy if exists "delete own state" on public.user_state;

create policy "read own state" on public.user_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own state" on public.user_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own state" on public.user_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own state" on public.user_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Lets a user delete their own account (and, via the cascade, their data).
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
