begin;

-- Keep the library private to authenticated users, but allow active resources
-- from admins or teachers to appear in student Library and teacher assignment.
drop policy if exists library_resources_select_active_global on public.library_resources;
drop policy if exists library_resources_select_active_authenticated on public.library_resources;
create policy library_resources_select_active_authenticated
  on public.library_resources
  for select
  to authenticated
  using (
    active = true
    or public.is_admin()
    or (public.is_teacher() and created_by = auth.uid())
  );

-- Teachers can create resources they own. Admins remain covered by
-- library_resources_admin_all from the foundation migration.
drop policy if exists library_resources_teacher_insert_own on public.library_resources;
create policy library_resources_teacher_insert_own
  on public.library_resources
  for insert
  to authenticated
  with check (
    public.is_teacher()
    and created_by = auth.uid()
  );

-- Teachers can update only their own resources. This keeps student/teacher
-- writes scoped without making the bucket or table public.
drop policy if exists library_resources_teacher_update_own on public.library_resources;
create policy library_resources_teacher_update_own
  on public.library_resources
  for update
  to authenticated
  using (
    public.is_teacher()
    and created_by = auth.uid()
  )
  with check (
    public.is_teacher()
    and created_by = auth.uid()
  );

commit;
