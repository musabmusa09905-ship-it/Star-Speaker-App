-- Step 100: controlled teacher-support messaging MVP.
-- This is not real-time chat. It stores focused student-teacher support threads only.

begin;

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  subject text default 'Teacher Support',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('student', 'teacher', 'admin')),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists message_threads_student_idx
  on public.message_threads (student_id);

create index if not exists message_threads_teacher_idx
  on public.message_threads (teacher_id);

create index if not exists message_threads_last_message_idx
  on public.message_threads (last_message_at desc nulls last);

create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at);

create index if not exists messages_sender_idx
  on public.messages (sender_id);

create or replace function public.validate_message_thread_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_role text;
  v_teacher_role text;
begin
  select role into v_student_role from public.profiles where id = new.student_id;
  select role into v_teacher_role from public.profiles where id = new.teacher_id;

  if v_student_role is distinct from 'student' then
    raise exception 'message_threads.student_id must reference a student profile';
  end if;

  if v_teacher_role is distinct from 'teacher' then
    raise exception 'message_threads.teacher_id must reference a teacher profile';
  end if;

  if not public.teacher_has_student(new.teacher_id, new.student_id) and not public.is_admin() then
    raise exception 'message thread must connect an assigned teacher and student';
  end if;

  return new;
end;
$$;

create or replace function public.touch_message_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.message_threads
  set
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists message_threads_set_updated_at on public.message_threads;
create trigger message_threads_set_updated_at
  before update on public.message_threads
  for each row execute function public.set_updated_at();

drop trigger if exists message_threads_validate_roles on public.message_threads;
create trigger message_threads_validate_roles
  before insert or update of student_id, teacher_id on public.message_threads
  for each row execute function public.validate_message_thread_roles();

drop trigger if exists messages_touch_thread on public.messages;
create trigger messages_touch_thread
  after insert on public.messages
  for each row execute function public.touch_message_thread_on_message();

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

grant select, insert on public.message_threads to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

drop policy if exists message_threads_admin_all on public.message_threads;
create policy message_threads_admin_all
  on public.message_threads
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists message_threads_student_select_own on public.message_threads;
create policy message_threads_student_select_own
  on public.message_threads
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists message_threads_teacher_select_assigned on public.message_threads;
create policy message_threads_teacher_select_assigned
  on public.message_threads
  for select
  to authenticated
  using (teacher_id = auth.uid());

drop policy if exists message_threads_student_insert_assigned on public.message_threads;
create policy message_threads_student_insert_assigned
  on public.message_threads
  for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and public.is_student()
    and public.teacher_has_student(teacher_id, auth.uid())
  );

drop policy if exists message_threads_teacher_insert_assigned on public.message_threads;
create policy message_threads_teacher_insert_assigned
  on public.message_threads
  for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and public.is_teacher()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists messages_admin_all on public.messages;
create policy messages_admin_all
  on public.messages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists messages_student_select_own_thread on public.messages;
create policy messages_student_select_own_thread
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.student_id = auth.uid()
    )
  );

drop policy if exists messages_teacher_select_assigned_thread on public.messages;
create policy messages_teacher_select_assigned_thread
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.teacher_id = auth.uid()
    )
  );

drop policy if exists messages_student_insert_own_thread on public.messages;
create policy messages_student_insert_own_thread
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'student'
    and exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.student_id = auth.uid()
    )
  );

drop policy if exists messages_teacher_insert_assigned_thread on public.messages;
create policy messages_teacher_insert_assigned_thread
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'teacher'
    and exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.teacher_id = auth.uid()
    )
  );

drop policy if exists messages_admin_insert on public.messages;
create policy messages_admin_insert
  on public.messages
  for insert
  to authenticated
  with check (public.is_admin() and sender_id = auth.uid() and sender_role = 'admin');

drop policy if exists messages_student_mark_read on public.messages;
create policy messages_student_mark_read
  on public.messages
  for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.student_id = auth.uid()
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.student_id = auth.uid()
    )
  );

drop policy if exists messages_teacher_mark_read on public.messages;
create policy messages_teacher_mark_read
  on public.messages
  for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.teacher_id = auth.uid()
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.message_threads thread
      where thread.id = messages.thread_id
        and thread.teacher_id = auth.uid()
    )
  );

commit;
