begin;

create table if not exists public.student_activity_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  task_id uuid references public.assigned_tasks(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete set null,
  event_type text not null check (
    event_type in (
      'app_opened',
      'task_viewed',
      'recording_started',
      'task_submitted',
      'feedback_viewed'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists student_activity_events_student_created_idx
  on public.student_activity_events (student_id, created_at desc);

create index if not exists student_activity_events_type_created_idx
  on public.student_activity_events (event_type, created_at desc);

create index if not exists student_activity_events_task_created_idx
  on public.student_activity_events (task_id, created_at desc)
  where task_id is not null;

create index if not exists student_activity_events_submission_created_idx
  on public.student_activity_events (submission_id, created_at desc)
  where submission_id is not null;

alter table public.student_activity_events enable row level security;

grant select, insert on public.student_activity_events to authenticated;

drop policy if exists student_activity_events_student_insert_own on public.student_activity_events;
create policy student_activity_events_student_insert_own
  on public.student_activity_events
  for insert
  to authenticated
  with check (
    public.is_student()
    and student_id = auth.uid()
    and (
      teacher_id is null
      or exists (
        select 1
        from public.teacher_students ts
        where ts.teacher_id = teacher_id
          and ts.student_id = auth.uid()
          and ts.active = true
      )
    )
  );

drop policy if exists student_activity_events_admin_like_select_all on public.student_activity_events;
create policy student_activity_events_admin_like_select_all
  on public.student_activity_events
  for select
  to authenticated
  using (public.is_admin_like());

drop policy if exists student_activity_events_teacher_select_assigned on public.student_activity_events;
create policy student_activity_events_teacher_select_assigned
  on public.student_activity_events
  for select
  to authenticated
  using (
    public.is_teacher()
    and public.teacher_has_student(auth.uid(), student_id)
  );

commit;
