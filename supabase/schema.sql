-- Midad cloud schema (v2)
-- Safe to run on a fresh Supabase project or over the earlier v1 Midad schema.
-- Run in the Supabase SQL Editor. This prepares the database; it does not connect the website yet.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists school_name text not null default '';
alter table public.profiles add column if not exists school_year text not null default '2026 / 2027';

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null default '',
  school_year text not null default '',
  created_at timestamptz not null default now()
);
alter table public.classes add column if not exists stage text not null default '';
alter table public.classes add column if not exists year text not null default '2026 / 2027';
alter table public.classes add column if not exists capacity text not null default '';

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  full_name text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.students add column if not exists student_number text not null default '';

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
alter table public.lessons add column if not exists created_on date not null default current_date;

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default '',
  assessment_type text not null default 'تكويني',
  assessment_date date,
  created_at timestamptz not null default now()
);
alter table public.assessments add column if not exists level text not null default '';
alter table public.assessments add column if not exists kind text not null default 'تقويم تكويني';
alter table public.assessments add column if not exists duration integer not null default 10;
alter table public.assessments add column if not exists questions jsonb not null default '[]'::jsonb;

-- Unique indexes are created before adding composite foreign keys below.
create unique index if not exists classes_id_owner_uidx on public.classes(id, owner_id);
create unique index if not exists students_id_owner_uidx on public.students(id, owner_id);
create unique index if not exists students_id_class_owner_uidx on public.students(id, class_id, owner_id);
create unique index if not exists lessons_id_owner_uidx on public.lessons(id, owner_id);

-- File metadata only. File bytes go to the private Storage bucket, not into JSON/localStorage.
create table if not exists public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null,
  file_name text not null,
  content_type text not null default 'application/octet-stream',
  file_size bigint not null default 0 check (file_size >= 0),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default '',
  level text not null default '',
  activity_type text not null default 'متنوع',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint activities_items_array check (jsonb_typeof(items) = 'array')
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null,
  student_id uuid not null,
  attendance_date date not null,
  status text not null check (status in ('حاضر', 'غائب', 'متأخر')),
  created_at timestamptz not null default now(),
  unique (owner_id, student_id, attendance_date)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'أخرى',
  url text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default '',
  level text not null default '',
  source_text text not null default '',
  mode text not null check (mode in ('board', 'interactive', 'summary')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Replace the old single-column FK with a same-owner FK; clear only any invalid cross-owner references.
update public.students s
set class_id = null
where s.class_id is not null
  and not exists (
    select 1 from public.classes c
    where c.id = s.class_id and c.owner_id = s.owner_id
  );
alter table public.students drop constraint if exists students_class_id_fkey;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_class_owner_fkey') then
    alter table public.students
      add constraint students_class_owner_fkey
      foreign key (class_id, owner_id)
      references public.classes(id, owner_id)
      on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lesson_files_lesson_owner_fkey') then
    alter table public.lesson_files
      add constraint lesson_files_lesson_owner_fkey
      foreign key (lesson_id, owner_id)
      references public.lessons(id, owner_id)
      on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'attendance_student_class_owner_fkey') then
    alter table public.attendance
      add constraint attendance_student_class_owner_fkey
      foreign key (student_id, class_id, owner_id)
      references public.students(id, class_id, owner_id)
      on delete cascade;
  end if;
end $$;

create index if not exists classes_owner_idx on public.classes(owner_id);
create index if not exists students_owner_idx on public.students(owner_id);
create index if not exists students_class_idx on public.students(class_id);
create index if not exists lessons_owner_idx on public.lessons(owner_id);
create index if not exists lesson_files_owner_idx on public.lesson_files(owner_id);
create index if not exists activities_owner_idx on public.activities(owner_id);
create index if not exists assessments_owner_idx on public.assessments(owner_id);
create index if not exists attendance_owner_date_idx on public.attendance(owner_id, attendance_date);
create index if not exists resources_owner_idx on public.resources(owner_id);
create index if not exists experiences_owner_idx on public.experiences(owner_id);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_files enable row level security;
alter table public.activities enable row level security;
alter table public.assessments enable row level security;
alter table public.attendance enable row level security;
alter table public.resources enable row level security;
alter table public.experiences enable row level security;

do $$
begin
  if to_regclass('public.attendance_sessions') is not null then
    alter table public.attendance_sessions enable row level security;
  end if;
  if to_regclass('public.attendance_records') is not null then
    alter table public.attendance_records enable row level security;
  end if;
end $$;

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
drop policy if exists "lesson_files_owner_all" on public.lesson_files;
create policy "lesson_files_owner_all" on public.lesson_files
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "activities_owner_all" on public.activities;
create policy "activities_owner_all" on public.activities
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "assessments_owner_all" on public.assessments;
create policy "assessments_owner_all" on public.assessments
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "attendance_owner_all" on public.attendance;
create policy "attendance_owner_all" on public.attendance
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "resources_owner_all" on public.resources;
create policy "resources_owner_all" on public.resources
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "experiences_owner_all" on public.experiences;
create policy "experiences_owner_all" on public.experiences
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on
  public.profiles, public.classes, public.students, public.lessons,
  public.lesson_files, public.activities, public.assessments,
  public.attendance, public.resources, public.experiences
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midad-lesson-files',
  'midad-lesson-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "midad_lesson_files_read_own" on storage.objects;
create policy "midad_lesson_files_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'midad-lesson-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "midad_lesson_files_insert_own" on storage.objects;
create policy "midad_lesson_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'midad-lesson-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "midad_lesson_files_update_own" on storage.objects;
create policy "midad_lesson_files_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'midad-lesson-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'midad-lesson-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "midad_lesson_files_delete_own" on storage.objects;
create policy "midad_lesson_files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'midad-lesson-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

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

commit;
