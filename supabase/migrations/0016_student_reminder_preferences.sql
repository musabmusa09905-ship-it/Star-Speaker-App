-- Step 90: in-app student reminder preference foundation.
-- This creates preference storage only. It does not send push, email, or external notifications.

begin;

create table if not exists public.student_reminder_preferences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade unique,
  reminders_enabled boolean not null default true,
  morning_enabled boolean not null default true,
  midday_enabled boolean not null default true,
  evening_enabled boolean not null default true,
  night_enabled boolean not null default true,
  positive_reinforcement_enabled boolean not null default true,
  preferred_morning_time text default '09:00',
  preferred_midday_time text default '12:00',
  preferred_evening_time text default '18:00',
  preferred_night_time text default '21:00',
  tone text default 'supportive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_reminder_preferences_student_idx
  on public.student_reminder_preferences (student_id);

drop trigger if exists student_reminder_preferences_set_updated_at
  on public.student_reminder_preferences;
create trigger student_reminder_preferences_set_updated_at
  before update on public.student_reminder_preferences
  for each row execute function public.set_updated_at();

alter table public.student_reminder_preferences enable row level security;

grant select, insert, update on public.student_reminder_preferences to authenticated;

drop policy if exists student_reminder_preferences_admin_select_all
  on public.student_reminder_preferences;
create policy student_reminder_preferences_admin_select_all
  on public.student_reminder_preferences
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists student_reminder_preferences_student_select_own
  on public.student_reminder_preferences;
create policy student_reminder_preferences_student_select_own
  on public.student_reminder_preferences
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists student_reminder_preferences_student_insert_own
  on public.student_reminder_preferences;
create policy student_reminder_preferences_student_insert_own
  on public.student_reminder_preferences
  for insert
  to authenticated
  with check (student_id = auth.uid() and public.is_student());

drop policy if exists student_reminder_preferences_student_update_own
  on public.student_reminder_preferences;
create policy student_reminder_preferences_student_update_own
  on public.student_reminder_preferences
  for update
  to authenticated
  using (student_id = auth.uid() and public.is_student())
  with check (student_id = auth.uid() and public.is_student());

drop policy if exists student_reminder_preferences_teacher_select_assigned
  on public.student_reminder_preferences;
create policy student_reminder_preferences_teacher_select_assigned
  on public.student_reminder_preferences
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

commit;
