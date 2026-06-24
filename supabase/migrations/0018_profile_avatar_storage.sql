-- Heart of English profile avatar storage
--
-- Creates a public-read bucket for small profile photos while keeping writes
-- scoped to the authenticated user's own folder:
-- profile-avatars/{auth.uid()}/avatar-{timestamp}.{ext}

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_avatars_public_read on storage.objects;
create policy profile_avatars_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-avatars');

drop policy if exists profile_avatars_insert_own_folder on storage.objects;
create policy profile_avatars_insert_own_folder
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_avatars_update_own_folder on storage.objects;
create policy profile_avatars_update_own_folder
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_avatars_delete_own_folder on storage.objects;
create policy profile_avatars_delete_own_folder
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
