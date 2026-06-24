-- Web push notification subscription foundation.
-- Stores browser push subscriptions only. This does not send scheduled notifications.

begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  role text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_user_endpoint_unique'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint);
  end if;
end $$;

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_active_role_idx
  on public.push_subscriptions (is_active, role);

drop trigger if exists push_subscriptions_set_updated_at
  on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists push_subscriptions_select_own
  on public.push_subscriptions;
create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert_own
  on public.push_subscriptions;
create policy push_subscriptions_insert_own
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_update_own
  on public.push_subscriptions;
create policy push_subscriptions_update_own
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_own
  on public.push_subscriptions;
create policy push_subscriptions_delete_own
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists push_subscriptions_admin_select_all
  on public.push_subscriptions;
create policy push_subscriptions_admin_select_all
  on public.push_subscriptions
  for select
  to authenticated
  using (public.is_admin());

commit;
