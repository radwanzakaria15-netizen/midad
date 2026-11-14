-- Midad registration roles: student signup is open; teacher signup requires a valid invitation.
-- Run once in Supabase SQL Editor AFTER schema.sql and teacher-invitations.sql.

begin;

alter table public.profiles
  add column if not exists account_type text not null default 'teacher';

alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('teacher','student','pending'));

create or replace function public.handle_new_midad_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_code text;
  v_invite_id uuid;
  v_provider text;
begin
  v_provider := coalesce(new.raw_app_meta_data ->> 'provider', '');

  -- OAuth providers cannot attach Supabase user metadata before the auth.users
  -- insert trigger runs. Create a restricted pending profile, then finalize it
  -- through complete_midad_registration after the OAuth redirect.
  if v_provider = 'google' then
    insert into public.profiles (id, full_name, account_type)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      'pending'
    )
    on conflict (id) do nothing;
    return new;
  end if;

  v_role := lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', 'teacher')));
  if v_role not in ('teacher', 'student') then
    raise exception 'نوع الحساب غير صالح';
  end if;

  if v_role = 'teacher' then
    v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
    if v_code = '' then
      raise exception 'رمز الدعوة من أستاذ سابق مطلوب لإنشاء حساب أستاذ';
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

  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.complete_midad_registration(
  p_role text,
  p_invite_code text default '',
  p_full_name text default ''
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_role text;
  v_code text;
  v_invite_id uuid;
begin
  if v_user_id is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if p_role not in ('teacher', 'student') then
    raise exception 'نوع الحساب غير صالح';
  end if;

  select p.account_type into v_current_role
  from public.profiles p
  where p.id = v_user_id
  for update;

  if v_current_role is null then
    raise exception 'لم يتم العثور على ملف الحساب';
  end if;

  if v_current_role <> 'pending' then
    return v_current_role;
  end if;

  if p_role = 'teacher' then
    v_code := upper(trim(coalesce(p_invite_code, '')));
    if v_code = '' then
      raise exception 'رمز الدعوة من أستاذ سابق مطلوب';
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
      set used_at = now(), used_by = v_user_id
      where id = v_invite_id;
  end if;

  update public.profiles
    set account_type = p_role,
        full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        updated_at = now()
    where id = v_user_id;

  return p_role;
end;
$$;

revoke all on function public.complete_midad_registration(text, text, text) from public, anon;
grant execute on function public.complete_midad_registration(text, text, text) to authenticated;

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
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'teacher'
  ) then
    raise exception 'إنشاء رموز الدعوة متاح لحسابات الأساتذة فقط';
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.teacher_invites(code, issuer_id)
  values (v_code, auth.uid());
  return v_code;
end;
$$;

revoke all on function public.create_midad_teacher_invite() from public, anon;
grant execute on function public.create_midad_teacher_invite() to authenticated;

commit;
