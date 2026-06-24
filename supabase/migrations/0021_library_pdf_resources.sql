-- Heart of English library PDF resources
--
-- Adds PDF metadata support to public.library_resources and creates a private
-- Supabase Storage bucket for teacher/admin PDF uploads.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library-resources',
  'library-resources',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf'];

alter table public.library_resources
  add column if not exists category text,
  add column if not exists focus text,
  add column if not exists file_path text,
  add column if not exists file_mime_type text,
  add column if not exists file_size_bytes integer check (
    file_size_bytes is null or file_size_bytes between 0 and 5242880
  );

alter table public.library_resources
  drop constraint if exists library_resources_resource_type_check;

alter table public.library_resources
  add constraint library_resources_resource_type_check
  check (
    resource_type in (
      'video',
      'article',
      'story',
      'photo_prompt',
      'weekly_pack',
      'speaking_prompt',
      'pronunciation_drill',
      'pdf'
    )
  );

create index if not exists library_resources_pdf_active_idx
  on public.library_resources (resource_type, active, created_at desc);

drop policy if exists library_resources_storage_managers_insert_pdf on storage.objects;
create policy library_resources_storage_managers_insert_pdf
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'library-resources'
    and (public.is_admin() or public.is_teacher())
    and lower(name) like '%.pdf'
  );

drop policy if exists library_resources_storage_authenticated_select on storage.objects;
create policy library_resources_storage_authenticated_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'library-resources');

drop policy if exists library_resources_storage_managers_update_own on storage.objects;
create policy library_resources_storage_managers_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'library-resources'
    and (public.is_admin() or public.is_teacher())
  )
  with check (
    bucket_id = 'library-resources'
    and (public.is_admin() or public.is_teacher())
    and lower(name) like '%.pdf'
  );

commit;
