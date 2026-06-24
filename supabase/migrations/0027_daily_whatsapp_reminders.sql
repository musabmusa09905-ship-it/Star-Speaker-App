-- Daily WhatsApp reminder contact fields and safe teacher updates.
-- This supports click-to-chat reminder preparation only. It does not send WhatsApp messages.

begin;

alter table public.profiles
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_opt_in boolean not null default false;

drop policy if exists profiles_teacher_update_assigned_student_whatsapp
  on public.profiles;
create policy profiles_teacher_update_assigned_student_whatsapp
  on public.profiles
  for update
  to authenticated
  using (
    public.is_teacher()
    and role = 'student'
    and public.teacher_has_student(auth.uid(), id)
  )
  with check (
    public.is_teacher()
    and role = 'student'
    and public.teacher_has_student(auth.uid(), id)
  );

commit;
