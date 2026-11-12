-- Midad teacher invitations and isolated workspaces
-- Run once in Supabase SQL Editor AFTER schema.sql.
begin;

create table if not exists public.teacher_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  issuer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

alter table public.teacher_invites enable row level security;
revoke all on public.teacher_invites from anon, authenticated;

create or replace function public.create_midad_teacher_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid()) then
    raise exception 'الحساب غير مهيأ';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.teacher_invites(code, issuer_id)
  values (v_code, auth.uid());
  return v_code;
end;
$$;

revoke all on function public.create_midad_teacher_invite() from public, anon;
grant execute on function public.create_midad_teacher_invite() to authenticated;

create or replace function public.handle_new_midad_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_invite_id uuid;
  v_profiles_count bigint;
begin
  -- Serialize first-account bootstrap so only one initial account can be created.
  perform pg_catalog.pg_advisory_xact_lock(781204119);

  select count(*) into v_profiles_count from public.profiles;

  if v_profiles_count > 0 then
    v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
    if v_code = '' then
      raise exception 'يلزم رمز دعوة صالح لإنشاء حساب أستاذ';
    end if;

    select i.id into v_invite_id
    from public.teacher_invites i
    where i.code = v_code
      and i.used_at is null
      and i.expires_at > now()
    for update;

    if v_invite_id is null then
      raise exception 'رمز الدعوة غير صالح أو منتهي أو مستخدم';
    end if;

    update public.teacher_invites
      set used_at = now(), used_by = new.id
      where id = v_invite_id;
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

commit;
