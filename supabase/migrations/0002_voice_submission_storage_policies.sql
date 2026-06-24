-- Heart of English voice submission policies
--
-- Run this after creating the private Supabase Storage bucket:
-- voice-submissions
--
-- This file does not make the bucket public. Students can upload/read only
-- objects inside their own storage folder:
-- students/{auth.uid()}/...

begin;

drop policy if exists voice_submissions_students_insert_own on storage.objects;
create policy voice_submissions_students_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'voice-submissions'
    and (storage.foldername(name))[1] = 'students'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists voice_submissions_students_select_own on storage.objects;
create policy voice_submissions_students_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'voice-submissions'
    and (storage.foldername(name))[1] = 'students'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create or replace function public.mark_own_assigned_task_submitted(
  p_assigned_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_task_id uuid;
begin
  update public.assigned_tasks
  set
    status = 'submitted',
    updated_at = now()
  where id = p_assigned_task_id
    and student_id = auth.uid()
    and status in ('assigned', 'in_progress', 'submitted')
  returning id into v_updated_task_id;

  if v_updated_task_id is null then
    raise exception 'Task not found or not accessible';
  end if;
end;
$$;

revoke all on function public.mark_own_assigned_task_submitted(uuid) from public;
grant execute on function public.mark_own_assigned_task_submitted(uuid) to authenticated;

commit;
