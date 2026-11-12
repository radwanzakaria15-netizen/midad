-- Midad per-teacher workspace cloud snapshot
-- Run once in Supabase SQL Editor after schema.sql and teacher-invitations.sql.
begin;

create table if not exists public.teacher_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint teacher_workspaces_object check (jsonb_typeof(workspace) = 'object')
);

alter table public.teacher_workspaces enable row level security;
drop policy if exists "teacher_workspaces_owner_all" on public.teacher_workspaces;
create policy "teacher_workspaces_owner_all" on public.teacher_workspaces
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.teacher_workspaces to authenticated;

commit;
