-- Student Motivation Profiles for personalized reminder previews.
-- Private teacher/admin notes used for safe, structured reminder personalization.

begin;

create table if not exists public.student_motivation_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid references auth.users(id) on delete set null,
  goal text,
  motivation_style text not null default 'soft_encouragement' check (
    motivation_style in (
      'soft_encouragement',
      'funny_push',
      'strict_kind',
      'emotional_reminder',
      'challenge_mode'
    )
  ),
  personal_trigger text,
  strength_note text,
  struggle_note text,
  preferred_push text,
  avoid_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);

create index if not exists student_motivation_profiles_student_idx
  on public.student_motivation_profiles (student_id);

create index if not exists student_motivation_profiles_teacher_idx
  on public.student_motivation_profiles (teacher_id);

create index if not exists student_motivation_profiles_active_idx
  on public.student_motivation_profiles (student_id, is_active, updated_at desc);

drop trigger if exists student_motivation_profiles_set_updated_at
  on public.student_motivation_profiles;
create trigger student_motivation_profiles_set_updated_at
  before update on public.student_motivation_profiles
  for each row execute function public.set_updated_at();

alter table public.student_motivation_profiles enable row level security;

grant select, insert, update on public.student_motivation_profiles to authenticated;

drop policy if exists student_motivation_profiles_admin_all
  on public.student_motivation_profiles;
create policy student_motivation_profiles_admin_all
  on public.student_motivation_profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists student_motivation_profiles_teacher_select_assigned
  on public.student_motivation_profiles;
create policy student_motivation_profiles_teacher_select_assigned
  on public.student_motivation_profiles
  for select
  to authenticated
  using (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists student_motivation_profiles_teacher_insert_assigned
  on public.student_motivation_profiles;
create policy student_motivation_profiles_teacher_insert_assigned
  on public.student_motivation_profiles
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists student_motivation_profiles_teacher_update_assigned
  on public.student_motivation_profiles;
create policy student_motivation_profiles_teacher_update_assigned
  on public.student_motivation_profiles
  for update
  to authenticated
  using (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  )
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

commit;
