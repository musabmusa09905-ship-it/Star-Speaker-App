-- Heart of English database foundation
-- Step 8: user roles, student/teacher relationships, speaking tasks, submissions, feedback,
-- weekly plans, and a minimal resource library foundation.
--
-- This migration intentionally inserts no fake production data.
-- Voice files should be stored later in a private Supabase Storage bucket named:
-- voice-submissions
-- Future object path pattern:
-- students/{student_id}/tasks/{assigned_task_id}/{submission_id}.webm

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null check (role in ('admin', 'teacher', 'student')),
  avatar_url text,
  status text not null default 'pending' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  level text,
  main_goal text,
  speaking_focus text,
  practice_duration_target integer check (practice_duration_target is null or practice_duration_target > 0),
  preferred_practice_time text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  title text,
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (teacher_id <> student_id)
);

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_type text not null check (
    task_type in (
      'speaking',
      'shadowing',
      'photo_description',
      'vocabulary_activation',
      'pronunciation',
      'reflection'
    )
  ),
  level text,
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  instructions text,
  guiding_phrases text[],
  checklist text[],
  created_by uuid references public.profiles(id) on delete set null,
  is_global boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assigned_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  template_id uuid references public.task_templates(id) on delete set null,
  title text not null,
  description text,
  task_type text not null check (
    task_type in (
      'speaking',
      'shadowing',
      'photo_description',
      'vocabulary_activation',
      'pronunciation',
      'reflection'
    )
  ),
  instructions text,
  guiding_phrases text[],
  checklist text[],
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  level text,
  focus text,
  due_date date,
  status text not null default 'assigned' check (
    status in ('assigned', 'in_progress', 'submitted', 'reviewed', 'missed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assigned_task_id uuid not null references public.assigned_tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  audio_url text,
  audio_path text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  reflection_text text,
  self_rating integer check (self_rating between 1 and 5),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'reviewed')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  assigned_task_id uuid not null references public.assigned_tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_comment text,
  correction_note text,
  encouragement_note text,
  clarity_score integer check (clarity_score between 1 and 5),
  confidence_score integer check (confidence_score between 1 and 5),
  accuracy_score integer check (accuracy_score between 1 and 5),
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  week_start date not null,
  week_end date not null,
  weekly_focus text,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (week_end >= week_start)
);

create table if not exists public.library_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_type text not null check (
    resource_type in (
      'video',
      'article',
      'story',
      'photo_prompt',
      'weekly_pack',
      'speaking_prompt',
      'pronunciation_drill'
    )
  ),
  url text,
  content text,
  level text,
  tags text[],
  created_by uuid references public.profiles(id) on delete set null,
  is_global boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

create index if not exists student_profiles_user_id_idx on public.student_profiles (user_id);
create index if not exists teacher_profiles_user_id_idx on public.teacher_profiles (user_id);

create unique index if not exists teacher_students_unique_active_pair_idx
  on public.teacher_students (teacher_id, student_id)
  where active;

create index if not exists teacher_students_teacher_idx on public.teacher_students (teacher_id) where active;
create index if not exists teacher_students_student_idx on public.teacher_students (student_id) where active;

create index if not exists task_templates_created_by_idx on public.task_templates (created_by);
create index if not exists task_templates_global_active_idx on public.task_templates (is_global, active);

create index if not exists assigned_tasks_student_idx on public.assigned_tasks (student_id);
create index if not exists assigned_tasks_teacher_idx on public.assigned_tasks (teacher_id);
create index if not exists assigned_tasks_status_idx on public.assigned_tasks (status);
create index if not exists assigned_tasks_due_date_idx on public.assigned_tasks (due_date);

create index if not exists submissions_student_idx on public.submissions (student_id);
create index if not exists submissions_task_idx on public.submissions (assigned_task_id);
create index if not exists submissions_status_idx on public.submissions (status);

create index if not exists feedback_student_idx on public.feedback (student_id);
create index if not exists feedback_teacher_idx on public.feedback (teacher_id);
create index if not exists feedback_submission_idx on public.feedback (submission_id);

create index if not exists weekly_plans_student_week_idx on public.weekly_plans (student_id, week_start);
create index if not exists weekly_plans_teacher_idx on public.weekly_plans (teacher_id);

create index if not exists library_resources_global_active_idx on public.library_resources (is_global, active);
create index if not exists library_resources_created_by_idx on public.library_resources (created_by);
create index if not exists library_resources_type_idx on public.library_resources (resource_type);

create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_user_role() = 'admin', false)
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_user_role() = 'teacher', false)
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_user_role() = 'student', false)
$$;

create or replace function public.teacher_has_student(p_teacher_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_students ts
    where ts.teacher_id = p_teacher_id
      and ts.student_id = p_student_id
      and ts.active = true
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
      return new;
    end if;

    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.status is distinct from old.status then
      raise exception 'Only admins can change profile id, email, role, or status';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_teacher_student_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_role text;
  v_student_role text;
begin
  select role into v_teacher_role from public.profiles where id = new.teacher_id;
  select role into v_student_role from public.profiles where id = new.student_id;

  if v_teacher_role is distinct from 'teacher' then
    raise exception 'teacher_id must reference a teacher profile';
  end if;

  if v_student_role is distinct from 'student' then
    raise exception 'student_id must reference a student profile';
  end if;

  return new;
end;
$$;

create or replace function public.validate_assigned_task_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_role text;
  v_student_role text;
begin
  select role into v_student_role from public.profiles where id = new.student_id;

  if v_student_role is distinct from 'student' then
    raise exception 'assigned_tasks.student_id must reference a student profile';
  end if;

  if new.teacher_id is not null then
    select role into v_teacher_role from public.profiles where id = new.teacher_id;

    if v_teacher_role is distinct from 'teacher' then
      raise exception 'assigned_tasks.teacher_id must reference a teacher profile';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_submission_task_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_student_id uuid;
begin
  select student_id into v_task_student_id
  from public.assigned_tasks
  where id = new.assigned_task_id;

  if v_task_student_id is distinct from new.student_id then
    raise exception 'submission student_id must match assigned task student_id';
  end if;

  return new;
end;
$$;

create or replace function public.validate_feedback_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_student_id uuid;
  v_submission_task_id uuid;
  v_teacher_role text;
begin
  select student_id, assigned_task_id
    into v_submission_student_id, v_submission_task_id
  from public.submissions
  where id = new.submission_id;

  if v_submission_student_id is distinct from new.student_id then
    raise exception 'feedback student_id must match submission student_id';
  end if;

  if v_submission_task_id is distinct from new.assigned_task_id then
    raise exception 'feedback assigned_task_id must match submission assigned_task_id';
  end if;

  if new.teacher_id is not null then
    select role into v_teacher_role from public.profiles where id = new.teacher_id;

    if v_teacher_role is distinct from 'teacher' then
      raise exception 'feedback.teacher_id must reference a teacher profile';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_weekly_plan_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_role text;
  v_student_role text;
begin
  select role into v_student_role from public.profiles where id = new.student_id;

  if v_student_role is distinct from 'student' then
    raise exception 'weekly_plans.student_id must reference a student profile';
  end if;

  if new.teacher_id is not null then
    select role into v_teacher_role from public.profiles where id = new.teacher_id;

    if v_teacher_role is distinct from 'teacher' then
      raise exception 'weekly_plans.teacher_id must reference a teacher profile';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_protect_system_fields on public.profiles;
create trigger profiles_protect_system_fields
  before update on public.profiles
  for each row execute function public.protect_profile_system_fields();

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists teacher_profiles_set_updated_at on public.teacher_profiles;
create trigger teacher_profiles_set_updated_at
  before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists teacher_students_validate_roles on public.teacher_students;
create trigger teacher_students_validate_roles
  before insert or update of teacher_id, student_id on public.teacher_students
  for each row execute function public.validate_teacher_student_roles();

drop trigger if exists task_templates_set_updated_at on public.task_templates;
create trigger task_templates_set_updated_at
  before update on public.task_templates
  for each row execute function public.set_updated_at();

drop trigger if exists assigned_tasks_set_updated_at on public.assigned_tasks;
create trigger assigned_tasks_set_updated_at
  before update on public.assigned_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists assigned_tasks_validate_roles on public.assigned_tasks;
create trigger assigned_tasks_validate_roles
  before insert or update of student_id, teacher_id on public.assigned_tasks
  for each row execute function public.validate_assigned_task_roles();

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

drop trigger if exists submissions_validate_task_owner on public.submissions;
create trigger submissions_validate_task_owner
  before insert or update of assigned_task_id, student_id on public.submissions
  for each row execute function public.validate_submission_task_owner();

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();

drop trigger if exists feedback_validate_links on public.feedback;
create trigger feedback_validate_links
  before insert or update of submission_id, assigned_task_id, student_id, teacher_id on public.feedback
  for each row execute function public.validate_feedback_links();

drop trigger if exists weekly_plans_set_updated_at on public.weekly_plans;
create trigger weekly_plans_set_updated_at
  before update on public.weekly_plans
  for each row execute function public.set_updated_at();

drop trigger if exists weekly_plans_validate_roles on public.weekly_plans;
create trigger weekly_plans_validate_roles
  before insert or update of student_id, teacher_id on public.weekly_plans
  for each row execute function public.validate_weekly_plan_roles();

drop trigger if exists library_resources_set_updated_at on public.library_resources;
create trigger library_resources_set_updated_at
  before update on public.library_resources
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_students enable row level security;
alter table public.task_templates enable row level security;
alter table public.assigned_tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.library_resources enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.student_profiles,
  public.teacher_profiles,
  public.teacher_students,
  public.task_templates,
  public.assigned_tasks,
  public.submissions,
  public.feedback,
  public.weekly_plans,
  public.library_resources
to authenticated;

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
  on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_assigned_students on public.profiles;
create policy profiles_select_assigned_students
  on public.profiles
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), id));

drop policy if exists profiles_select_assigned_teachers on public.profiles;
create policy profiles_select_assigned_teachers
  on public.profiles
  for select
  to authenticated
  using (public.is_student() and public.teacher_has_student(id, auth.uid()));

drop policy if exists profiles_insert_own_pending_student on public.profiles;
create policy profiles_insert_own_pending_student
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid() and role = 'student' and status = 'pending');

drop policy if exists profiles_update_own_safe_fields on public.profiles;
create policy profiles_update_own_safe_fields
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists student_profiles_admin_all on public.student_profiles;
create policy student_profiles_admin_all
  on public.student_profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists student_profiles_select_own on public.student_profiles;
create policy student_profiles_select_own
  on public.student_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists student_profiles_select_assigned_teacher on public.student_profiles;
create policy student_profiles_select_assigned_teacher
  on public.student_profiles
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), user_id));

drop policy if exists student_profiles_teacher_insert_assigned on public.student_profiles;
create policy student_profiles_teacher_insert_assigned
  on public.student_profiles
  for insert
  to authenticated
  with check (public.is_teacher() and public.teacher_has_student(auth.uid(), user_id));

drop policy if exists student_profiles_teacher_update_assigned on public.student_profiles;
create policy student_profiles_teacher_update_assigned
  on public.student_profiles
  for update
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), user_id))
  with check (public.is_teacher() and public.teacher_has_student(auth.uid(), user_id));

drop policy if exists teacher_profiles_admin_all on public.teacher_profiles;
create policy teacher_profiles_admin_all
  on public.teacher_profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists teacher_profiles_select_own on public.teacher_profiles;
create policy teacher_profiles_select_own
  on public.teacher_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists teacher_profiles_select_assigned_student on public.teacher_profiles;
create policy teacher_profiles_select_assigned_student
  on public.teacher_profiles
  for select
  to authenticated
  using (public.is_student() and public.teacher_has_student(user_id, auth.uid()));

drop policy if exists teacher_students_admin_all on public.teacher_students;
create policy teacher_students_admin_all
  on public.teacher_students
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists teacher_students_select_teacher_assignments on public.teacher_students;
create policy teacher_students_select_teacher_assignments
  on public.teacher_students
  for select
  to authenticated
  using (teacher_id = auth.uid());

drop policy if exists teacher_students_select_student_assignments on public.teacher_students;
create policy teacher_students_select_student_assignments
  on public.teacher_students
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists task_templates_admin_all on public.task_templates;
create policy task_templates_admin_all
  on public.task_templates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists task_templates_teacher_select on public.task_templates;
create policy task_templates_teacher_select
  on public.task_templates
  for select
  to authenticated
  using (
    public.is_teacher()
    and (
      (active = true and is_global = true)
      or created_by = auth.uid()
    )
  );

drop policy if exists task_templates_teacher_insert_own on public.task_templates;
create policy task_templates_teacher_insert_own
  on public.task_templates
  for insert
  to authenticated
  with check (public.is_teacher() and created_by = auth.uid() and is_global = false);

drop policy if exists task_templates_teacher_update_own on public.task_templates;
create policy task_templates_teacher_update_own
  on public.task_templates
  for update
  to authenticated
  using (public.is_teacher() and created_by = auth.uid() and is_global = false)
  with check (public.is_teacher() and created_by = auth.uid() and is_global = false);

drop policy if exists task_templates_teacher_delete_own on public.task_templates;
create policy task_templates_teacher_delete_own
  on public.task_templates
  for delete
  to authenticated
  using (public.is_teacher() and created_by = auth.uid() and is_global = false);

drop policy if exists assigned_tasks_admin_all on public.assigned_tasks;
create policy assigned_tasks_admin_all
  on public.assigned_tasks
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists assigned_tasks_student_select_own on public.assigned_tasks;
create policy assigned_tasks_student_select_own
  on public.assigned_tasks
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists assigned_tasks_teacher_select_assigned on public.assigned_tasks;
create policy assigned_tasks_teacher_select_assigned
  on public.assigned_tasks
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists assigned_tasks_teacher_insert_assigned on public.assigned_tasks;
create policy assigned_tasks_teacher_insert_assigned
  on public.assigned_tasks
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists assigned_tasks_teacher_update_assigned on public.assigned_tasks;
create policy assigned_tasks_teacher_update_assigned
  on public.assigned_tasks
  for update
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id))
  with check (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists submissions_admin_all on public.submissions;
create policy submissions_admin_all
  on public.submissions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists submissions_student_select_own on public.submissions;
create policy submissions_student_select_own
  on public.submissions
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists submissions_student_insert_own on public.submissions;
create policy submissions_student_insert_own
  on public.submissions
  for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.assigned_tasks task
      where task.id = assigned_task_id
        and task.student_id = auth.uid()
    )
  );

drop policy if exists submissions_student_update_own_draft on public.submissions;
create policy submissions_student_update_own_draft
  on public.submissions
  for update
  to authenticated
  using (student_id = auth.uid() and status = 'draft')
  with check (
    student_id = auth.uid()
    and status in ('draft', 'submitted')
    and exists (
      select 1
      from public.assigned_tasks task
      where task.id = assigned_task_id
        and task.student_id = auth.uid()
    )
  );

drop policy if exists submissions_teacher_select_assigned on public.submissions;
create policy submissions_teacher_select_assigned
  on public.submissions
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists feedback_admin_all on public.feedback;
create policy feedback_admin_all
  on public.feedback
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists feedback_student_select_own on public.feedback;
create policy feedback_student_select_own
  on public.feedback
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists feedback_teacher_select_assigned on public.feedback;
create policy feedback_teacher_select_assigned
  on public.feedback
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists feedback_teacher_insert_assigned on public.feedback;
create policy feedback_teacher_insert_assigned
  on public.feedback
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists feedback_teacher_update_assigned on public.feedback;
create policy feedback_teacher_update_assigned
  on public.feedback
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

drop policy if exists weekly_plans_admin_all on public.weekly_plans;
create policy weekly_plans_admin_all
  on public.weekly_plans
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists weekly_plans_student_select_own on public.weekly_plans;
create policy weekly_plans_student_select_own
  on public.weekly_plans
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists weekly_plans_teacher_select_assigned on public.weekly_plans;
create policy weekly_plans_teacher_select_assigned
  on public.weekly_plans
  for select
  to authenticated
  using (public.is_teacher() and public.teacher_has_student(auth.uid(), student_id));

drop policy if exists weekly_plans_teacher_insert_assigned on public.weekly_plans;
create policy weekly_plans_teacher_insert_assigned
  on public.weekly_plans
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and teacher_id = auth.uid()
    and public.teacher_has_student(auth.uid(), student_id)
  );

drop policy if exists weekly_plans_teacher_update_assigned on public.weekly_plans;
create policy weekly_plans_teacher_update_assigned
  on public.weekly_plans
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

drop policy if exists library_resources_admin_all on public.library_resources;
create policy library_resources_admin_all
  on public.library_resources
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists library_resources_select_active_global on public.library_resources;
create policy library_resources_select_active_global
  on public.library_resources
  for select
  to authenticated
  using (active = true and is_global = true);

drop policy if exists library_resources_teacher_select_own on public.library_resources;
create policy library_resources_teacher_select_own
  on public.library_resources
  for select
  to authenticated
  using (public.is_teacher() and created_by = auth.uid());

drop policy if exists library_resources_teacher_insert_own on public.library_resources;
create policy library_resources_teacher_insert_own
  on public.library_resources
  for insert
  to authenticated
  with check (public.is_teacher() and created_by = auth.uid() and is_global = false);

drop policy if exists library_resources_teacher_update_own on public.library_resources;
create policy library_resources_teacher_update_own
  on public.library_resources
  for update
  to authenticated
  using (public.is_teacher() and created_by = auth.uid() and is_global = false)
  with check (public.is_teacher() and created_by = auth.uid() and is_global = false);

drop policy if exists library_resources_teacher_delete_own on public.library_resources;
create policy library_resources_teacher_delete_own
  on public.library_resources
  for delete
  to authenticated
  using (public.is_teacher() and created_by = auth.uid() and is_global = false);

commit;
