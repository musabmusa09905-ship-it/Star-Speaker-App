-- Heart of English teacher review policies
--
-- Run this if teachers cannot play assigned student recordings or if review
-- status updates fail after feedback is inserted.
--
-- This keeps the voice-submissions bucket private. Teachers can only create
-- signed playback URLs for recordings in folders belonging to their assigned
-- active students.

begin;

drop policy if exists voice_submissions_teachers_select_assigned on storage.objects;
create policy voice_submissions_teachers_select_assigned
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'voice-submissions'
    and (storage.foldername(name))[1] = 'students'
    and case
      when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.teacher_has_student(auth.uid(), ((storage.foldername(name))[2])::uuid)
      else false
    end
  );

create or replace function public.mark_teacher_review_complete(
  p_submission_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_assigned_task_id uuid;
begin
  select student_id, assigned_task_id
    into v_student_id, v_assigned_task_id
  from public.submissions
  where id = p_submission_id;

  if v_student_id is null or v_assigned_task_id is null then
    raise exception 'Submission not found';
  end if;

  if not public.teacher_has_student(auth.uid(), v_student_id) then
    raise exception 'Teacher is not assigned to this student';
  end if;

  if not exists (
    select 1
    from public.feedback
    where submission_id = p_submission_id
      and teacher_id = auth.uid()
  ) then
    raise exception 'Teacher feedback is required before marking this submission reviewed';
  end if;

  update public.submissions
  set
    status = 'reviewed',
    updated_at = now()
  where id = p_submission_id;

  update public.assigned_tasks
  set
    status = 'reviewed',
    updated_at = now()
  where id = v_assigned_task_id
    and student_id = v_student_id;
end;
$$;

revoke all on function public.mark_teacher_review_complete(uuid) from public;
grant execute on function public.mark_teacher_review_complete(uuid) to authenticated;

commit;
