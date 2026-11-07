-- Midad cloud database schema
-- Run this file in Supabase SQL Editor for the dedicated Midad project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null default '',
  school_year text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  full_name text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default '',
  level text not null default '',
  objective text not null default '',
  lesson_date date,
  content text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  subject text not null default '',
  assessment_type text not null default 'تكويني',
  assessment_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session_date date not null,
  created_at timestamptz not null default now(),
  unique (owner_id, class_id, session_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('حاضر', 'غائب', 'متأخر')),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists classes_owner_idx on public.classes(owner_id);
create index if not exists students_owner_idx on public.students(owner_id);
create index if not exists students_class_idx on public.students(class_id);
create index if not exists lessons_owner_idx on public.lessons(owner_id);
create index if not exists assessments_owner_idx on public.assessments(owner_id);
create index if not exists attendance_sessions_owner_idx on public.attendance_sessions(owner_id);
create index if not exists attendance_records_owner_idx on public.attendance_records(owner_id);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.assessments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "classes_owner_all" on public.classes;
create policy "classes_owner_all" on public.classes
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "students_owner_all" on public.students;
create policy "students_owner_all" on public.students
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "lessons_owner_all" on public.lessons;
create policy "lessons_owner_all" on public.lessons
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "assessments_owner_all" on public.assessments;
create policy "assessments_owner_all" on public.assessments
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "attendance_sessions_owner_all" on public.attendance_sessions;
create policy "attendance_sessions_owner_all" on public.attendance_sessions
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "attendance_records_owner_all" on public.attendance_records;
create policy "attendance_records_owner_all" on public.attendance_records
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on
  public.profiles, public.classes, public.students, public.lessons,
  public.assessments, public.attendance_sessions, public.attendance_records
to authenticated;

-- Create a profile row automatically whenever a new auth user signs up.
create or replace function public.handle_new_midad_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_midad_auth_user_created on auth.users;
create trigger on_midad_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_midad_user();
