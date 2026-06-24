# Admin Bootstrap Guide

After the Heart of English foundation migration runs, you need one initial admin profile so the app has a trusted account that can manage users, teachers, students, and school-level data.

This is a one-time bootstrap step only.

## Steps

1. Run the database migration first.
2. Create or sign up your first admin user in Supabase Auth.
3. Copy that user's Auth user id from Supabase.
4. Use the Supabase SQL Editor or a service-role-only server script to insert or update that user's row in `public.profiles`.

Normal users should not be able to make themselves admin. The app's RLS and profile protection are designed so admin role assignment must be done through trusted admin/service-role access, not from the client.

## One-Time SQL Template

```sql
-- Replace these values with the real auth user id and email
insert into public.profiles (id, full_name, email, role, status)
values (
  'AUTH_USER_ID_HERE',
  'Admin Name',
  'admin@email.com',
  'admin',
  'active'
)
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  role = 'admin',
  status = 'active',
  updated_at = now();
```

Only run this for the trusted first admin account.
