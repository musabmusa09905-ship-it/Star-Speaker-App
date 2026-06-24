-- Step 78+: writing practice tasks, submissions, and review workflow.
-- This keeps writing separate from voice/audio submissions so neither flow has
-- to pretend to be the other.

begin;

create table if not exists public.writing_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) > 0),
  prompt text not null check (length(trim(prompt)) > 0),
  instructions text,
  level text,
  focus text,
  due_date date,
  min_words integer not null default 80 check (min_words > 0),
  status text not null default 'assigned' check (status in ('assigned', 'submitted', 'reviewed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.writing_tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answer_text text not null check (length(trim(answer_text)) > 0 and length(answer_text) <= 3000),
  self_reflection text,
  teacher_feedback text,
  correction_note text,
  corrected_version text,
  encouragement_note text,
  next_focus text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, student_id)
);

create index if not exists writing_tasks_student_idx on public.writing_tasks (student_id);
create index if not exists writing_tasks_assigned_by_idx on public.writing_tasks (assigned_by);
create index if not exists writing_tasks_status_idx on public.writing_tasks (status);
create index if not exists writing_tasks_due_date_idx on public.writing_tasks (due_date);

create index if not exists writing_submissions_task_idx on public.writing_submissions (task_id);
create index if not exists writing_submissions_student_idx on public.writing_submissions (student_id);
create index if not exists writing_submissions_status_idx on public.writing_submissions (status);
create index if not exists writing_submissions_submitted_at_idx on public.writing_submissions (submitted_at);

drop trigger if exists writing_tasks_set_updated_at on public.writing_tasks;
create trigger writing_tasks_set_updated_at
  before update on public.writing_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists writing_submissions_set_updated_at on public.writing_submissions;
create trigger writing_submissions_set_updated_at
  before update on public.writing_submissions
  for each row execute function public.set_updated_at();

alter table public.writing_tasks enable row level security;
alter table public.writing_submissions enable row level security;

grant select, insert, update, delete on
  public.writing_tasks,
  public.writing_submissions
to authenticated;

drop policy if exists writing_tasks_admin_all on public.writing_tasks;
create policy writing_tasks_admin_all
  on public.writing_tasks
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists writing_tasks_student_select_own on public.writing_tasks;
create policy writing_tasks_student_select_own
  on public.writing_tasks
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists writing_tasks_teacher_select_assigned on public.writing_tasks;
create policy writing_tasks_teacher_select_assigned
  on public.writing_tasks
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists writing_tasks_teacher_insert_assigned on public.writing_tasks;
create policy writing_tasks_teacher_insert_assigned
  on public.writing_tasks
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and assigned_by = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists writing_tasks_teacher_update_assigned on public.writing_tasks;
create policy writing_tasks_teacher_update_assigned
  on public.writing_tasks
  for update
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id))
  with check (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists writing_submissions_admin_all on public.writing_submissions;
create policy writing_submissions_admin_all
  on public.writing_submissions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists writing_submissions_student_select_own on public.writing_submissions;
create policy writing_submissions_student_select_own
  on public.writing_submissions
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists writing_submissions_student_insert_own on public.writing_submissions;
create policy writing_submissions_student_insert_own
  on public.writing_submissions
  for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.writing_tasks task
      where task.id = task_id
        and task.student_id = auth.uid()
        and task.status = 'assigned'
    )
  );

drop policy if exists writing_submissions_teacher_select_assigned on public.writing_submissions;
create policy writing_submissions_teacher_select_assigned
  on public.writing_submissions
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists writing_submissions_teacher_update_assigned on public.writing_submissions;
create policy writing_submissions_teacher_update_assigned
  on public.writing_submissions
  for update
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id))
  with check (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

commit;
