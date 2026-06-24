-- Admin/coordinator management and Heart of English level support.
-- Run after the foundation migration and existing profile-field migrations.

begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'coordinator', 'teacher', 'student'));

create or replace function public.is_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_user_role() = 'coordinator', false)
$$;

create or replace function public.is_admin_like()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_user_role() in ('admin', 'coordinator'), false)
$$;

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
      return new;
    end if;

    if public.is_coordinator() then
      if old.role is distinct from 'student'
        or new.role is distinct from old.role
        or new.id is distinct from old.id
        or new.email is distinct from old.email then
        raise exception 'Coordinators can update student profile details only';
      end if;

      return new;
    end if;

    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.status is distinct from old.status then
      raise exception 'Only admins can change profile id, email, role, or status';
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists profiles_coordinator_select on public.profiles;
create policy profiles_coordinator_select
  on public.profiles
  for select
  to authenticated
  using (public.is_coordinator());

drop policy if exists profiles_coordinator_update_students on public.profiles;
create policy profiles_coordinator_update_students
  on public.profiles
  for update
  to authenticated
  using (public.is_coordinator() and role = 'student')
  with check (public.is_coordinator() and role = 'student');

drop policy if exists profiles_coordinator_insert_students on public.profiles;
create policy profiles_coordinator_insert_students
  on public.profiles
  for insert
  to authenticated
  with check (public.is_coordinator() and role = 'student');

drop policy if exists student_profiles_coordinator_all on public.student_profiles;
create policy student_profiles_coordinator_all
  on public.student_profiles
  for all
  to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

drop policy if exists teacher_students_coordinator_all on public.teacher_students;
create policy teacher_students_coordinator_all
  on public.teacher_students
  for all
  to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

commit;
