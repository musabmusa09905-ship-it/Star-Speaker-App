-- Phase 2: warm daily email reminders for missed speaking/writing practice.
-- This extends the existing in-app reminder preferences. It does not weaken RLS
-- and does not store any provider secrets in the database.

begin;

alter table if exists public.student_reminder_preferences
  add column if not exists email_reminders_enabled boolean not null default false,
  add column if not exists preferred_email_time text default '18:00',
  add column if not exists email_timezone text default 'Europe/Istanbul';

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  reminder_date date not null,
  channel text not null default 'email' check (channel in ('email')),
  reminder_type text not null default 'missed_daily_practice',
  status text not null check (status in ('queued', 'sent', 'skipped', 'failed', 'dry_run')),
  provider text default 'resend',
  provider_message_id text,
  task_summary jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, reminder_date, channel, reminder_type)
);

create index if not exists reminder_logs_student_idx
  on public.reminder_logs (student_id);

create index if not exists reminder_logs_date_idx
  on public.reminder_logs (reminder_date desc);

drop trigger if exists reminder_logs_set_updated_at
  on public.reminder_logs;
create trigger reminder_logs_set_updated_at
  before update on public.reminder_logs
  for each row execute function public.set_updated_at();

alter table public.reminder_logs enable row level security;

grant select on public.reminder_logs to authenticated;

drop policy if exists reminder_logs_admin_select_all
  on public.reminder_logs;
create policy reminder_logs_admin_select_all
  on public.reminder_logs
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists reminder_logs_student_select_own
  on public.reminder_logs;
create policy reminder_logs_student_select_own
  on public.reminder_logs
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists reminder_logs_teacher_select_assigned
  on public.reminder_logs;
create policy reminder_logs_teacher_select_assigned
  on public.reminder_logs
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

commit;
