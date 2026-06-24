-- Daily Reminder Dashboard support.
-- Extends reminder_logs so teachers/admins can manually mark reminder and
-- encouragement previews without sending real messages.

begin;

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  reminder_date date not null,
  reminder_slot text not null default 'afternoon_missing',
  channel text not null default 'email',
  reminder_type text not null default 'missing_task',
  status text not null default 'manual_marked',
  provider text,
  provider_message_id text,
  task_summary jsonb,
  message_preview text,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminder_logs
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null,
  add column if not exists reminder_slot text,
  add column if not exists sent_at timestamptz,
  add column if not exists message_preview text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.reminder_logs
  drop constraint if exists reminder_logs_channel_check,
  drop constraint if exists reminder_logs_status_check,
  drop constraint if exists reminder_logs_slot_check,
  drop constraint if exists reminder_logs_student_id_reminder_date_channel_reminder_type_key;

update public.reminder_logs
set reminder_slot = case
  when reminder_slot is not null then reminder_slot
  when reminder_type = 'missed_daily_practice' then 'afternoon_missing'
  when reminder_type = 'completed_encouragement' then 'completed_encouragement'
  else 'afternoon_missing'
end
where reminder_slot is null;

alter table public.reminder_logs
  alter column reminder_slot set default 'afternoon_missing',
  alter column reminder_slot set not null,
  alter column channel set default 'email',
  alter column reminder_type set default 'missing_task',
  alter column status set default 'manual_marked';

alter table public.reminder_logs
  add constraint reminder_logs_channel_check
    check (channel in ('email', 'whatsapp', 'manual')),
  add constraint reminder_logs_status_check
    check (status in ('queued', 'sent', 'skipped', 'failed', 'dry_run', 'manual_marked')),
  add constraint reminder_logs_slot_check
    check (reminder_slot in (
      'morning_ready',
      'afternoon_missing',
      'evening_missing',
      'whatsapp_daily',
      'whatsapp_missing',
      'completed_encouragement'
    ));

create index if not exists reminder_logs_student_idx
  on public.reminder_logs (student_id);

create index if not exists reminder_logs_teacher_idx
  on public.reminder_logs (teacher_id);

create index if not exists reminder_logs_date_idx
  on public.reminder_logs (reminder_date desc);

drop index if exists reminder_logs_student_teacher_channel_slot_date_idx;
create unique index reminder_logs_student_teacher_channel_slot_date_idx
  on public.reminder_logs (
    student_id,
    coalesce(teacher_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel,
    reminder_slot,
    reminder_date
  );

drop trigger if exists reminder_logs_set_updated_at
  on public.reminder_logs;
create trigger reminder_logs_set_updated_at
  before update on public.reminder_logs
  for each row execute function public.set_updated_at();

alter table public.reminder_logs enable row level security;

grant select, insert, update on public.reminder_logs to authenticated;

drop policy if exists reminder_logs_admin_select_all
  on public.reminder_logs;
drop policy if exists reminder_logs_admin_all
  on public.reminder_logs;
create policy reminder_logs_admin_all
  on public.reminder_logs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

drop policy if exists reminder_logs_teacher_insert_assigned
  on public.reminder_logs;
create policy reminder_logs_teacher_insert_assigned
  on public.reminder_logs
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists reminder_logs_teacher_update_assigned
  on public.reminder_logs;
create policy reminder_logs_teacher_update_assigned
  on public.reminder_logs
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
