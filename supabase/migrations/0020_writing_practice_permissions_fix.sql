-- Fix missing table privileges for the writing practice tables.
-- RLS policies still control row-level access; these grants only allow
-- authenticated users to reach the policies.

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.writing_tasks,
  public.writing_submissions
to authenticated;

alter table public.writing_tasks enable row level security;
alter table public.writing_submissions enable row level security;

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
