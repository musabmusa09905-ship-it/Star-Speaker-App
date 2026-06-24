-- Scheduled notification event foundation.
-- Stores pending notification records only. This does not send push, email, or WhatsApp.

begin;

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  notification_slot text not null,
  notification_date date not null,
  title text not null,
  body text not null,
  target_url text,
  status text not null default 'pending'
    check (status in ('pending', 'skipped', 'cancelled', 'sent_later', 'failed_later')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_events_user_slot_date_unique'
      and conrelid = 'public.notification_events'::regclass
  ) then
    alter table public.notification_events
      add constraint notification_events_user_slot_date_unique
      unique (user_id, notification_type, notification_slot, notification_date);
  end if;
end $$;

create index if not exists notification_events_user_idx
  on public.notification_events (user_id);

create index if not exists notification_events_status_date_idx
  on public.notification_events (status, notification_date desc);

create index if not exists notification_events_slot_date_idx
  on public.notification_events (notification_slot, notification_date desc);

drop trigger if exists notification_events_set_updated_at
  on public.notification_events;
create trigger notification_events_set_updated_at
  before update on public.notification_events
  for each row execute function public.set_updated_at();

alter table public.notification_events enable row level security;

grant select on public.notification_events to authenticated;

drop policy if exists notification_events_select_own
  on public.notification_events;
create policy notification_events_select_own
  on public.notification_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notification_events_admin_like_select_all
  on public.notification_events;
create policy notification_events_admin_like_select_all
  on public.notification_events
  for select
  to authenticated
  using (public.is_admin_like());

drop policy if exists notification_events_teacher_select_assigned_operational
  on public.notification_events;
create policy notification_events_teacher_select_assigned_operational
  on public.notification_events
  for select
  to authenticated
  using (
    public.is_teacher()
    and (
      user_id = auth.uid()
      or (
        metadata ? 'studentId'
        and public.teacher_has_student(auth.uid(), (metadata ->> 'studentId')::uuid)
      )
    )
  );

commit;
