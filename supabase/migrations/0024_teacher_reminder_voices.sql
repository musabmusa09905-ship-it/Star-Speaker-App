-- Teacher Reminder Voice foundation.
-- Stores safe template settings for teacher/admin reminder previews.

begin;

create table if not exists public.teacher_reminder_voices (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  tone text not null default 'warm_calm' check (
    tone in (
      'warm_calm',
      'playful_funny',
      'strict_kind',
      'energetic_coach',
      'gentle_encouragement'
    )
  ),
  humor_level text not null default 'medium' check (humor_level in ('low', 'medium', 'high')),
  style_notes text,
  catchphrases text[] default '{}',
  forbidden_style text,
  signature_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id)
);

create index if not exists teacher_reminder_voices_teacher_idx
  on public.teacher_reminder_voices (teacher_id);

drop trigger if exists teacher_reminder_voices_set_updated_at
  on public.teacher_reminder_voices;
create trigger teacher_reminder_voices_set_updated_at
  before update on public.teacher_reminder_voices
  for each row execute function public.set_updated_at();

alter table public.teacher_reminder_voices enable row level security;

grant select, insert, update on public.teacher_reminder_voices to authenticated;

drop policy if exists teacher_reminder_voices_admin_select_all
  on public.teacher_reminder_voices;
create policy teacher_reminder_voices_admin_select_all
  on public.teacher_reminder_voices
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists teacher_reminder_voices_owner_select
  on public.teacher_reminder_voices;
create policy teacher_reminder_voices_owner_select
  on public.teacher_reminder_voices
  for select
  to authenticated
  using (teacher_id = auth.uid() and (public.is_teacher() or public.is_admin()));

drop policy if exists teacher_reminder_voices_owner_insert
  on public.teacher_reminder_voices;
create policy teacher_reminder_voices_owner_insert
  on public.teacher_reminder_voices
  for insert
  to authenticated
  with check (teacher_id = auth.uid() and (public.is_teacher() or public.is_admin()));

drop policy if exists teacher_reminder_voices_owner_update
  on public.teacher_reminder_voices;
create policy teacher_reminder_voices_owner_update
  on public.teacher_reminder_voices
  for update
  to authenticated
  using (teacher_id = auth.uid() and (public.is_teacher() or public.is_admin()))
  with check (teacher_id = auth.uid() and (public.is_teacher() or public.is_admin()));

commit;
