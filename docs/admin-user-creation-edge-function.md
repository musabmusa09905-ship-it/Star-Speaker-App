# Admin User Creation Edge Function

The Admin Users page creates students and teachers through the `admin-create-user` Supabase Edge Function.

## Function Path

```text
supabase/functions/admin-create-user/index.ts
```

## What The Function Does

1. Reads `Authorization: Bearer <user-access-token>` from the request.
2. Verifies that token with the normal Supabase Auth client.
3. Creates a separate server-side client using `ADMIN_CREATE_USER_SERVICE_ROLE_KEY`.
4. Reads `public.profiles` with the service-role client.
5. Allows the request only when the caller profile has `role = 'admin'` and `status = 'active'`.
6. Creates the Supabase Auth user.
7. Creates or updates `public.profiles`.
8. Creates or updates `public.student_profiles` or `public.teacher_profiles`.

For student accounts, the function also accepts the safe contact fields used by the Daily Reminders page:

- `whatsapp_number`
- `whatsapp_opt_in`

The browser never receives privileged credentials and never calls the Auth Admin API directly.

## Required Secret

Set this Supabase Edge Function secret:

```bash
supabase secrets set ADMIN_CREATE_USER_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Use the `service_role` key from the exact same Supabase project used by `VITE_SUPABASE_URL`.

Do not use the anon key for this secret.
Do not put this value in Vite environment variables.
Do not put this value in `.env.local`.
Do not commit this value to GitHub.

Supabase Edge Functions usually provide `SUPABASE_URL` and `SUPABASE_ANON_KEY` automatically. If your project environment does not, set them as function secrets too:

```bash
supabase secrets set SUPABASE_URL=YOUR_SUPABASE_URL
supabase secrets set SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Deploy

Committing to GitHub and redeploying Vercel does not update Supabase Edge Function code.

After changing `supabase/functions/admin-create-user/index.ts`, redeploy the function manually:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-create-user
```

For this app, the project ref should match the project used by the deployed frontend `VITE_SUPABASE_URL`.

## Diagnostic Check

The Admin Users page includes a button:

```text
Test User Creation Setup
```

Use it after deploying the function. It sends:

```json
{
  "debug": true
}
```

The diagnostic check does not create a user and does not return secrets.

## Diagnostic Fields

- `functionName`: confirms the running function is `admin-create-user`.
- `hasAuthHeader`: confirms the browser sent an Authorization header.
- `callerUserResolved`: confirms Supabase Auth accepted the user access token.
- `callerUserIdExists`: confirms the resolved caller has an Auth user ID.
- `serviceRoleSecretPresent`: confirms `ADMIN_CREATE_USER_SERVICE_ROLE_KEY` exists in function secrets.
- `serviceRoleSecretLooksLikeJwt`: confirms the secret is shaped like a JWT.
- `serviceRoleClientProfileReadSucceeded`: confirms the service-role client could read `public.profiles`.
- `adminProfileFound`: confirms a matching `public.profiles` row exists for the caller.
- `adminRoleValue`: shows the caller profile role value if found.
- `adminStatusValue`: shows the caller profile status value if found.
- `projectUrlUsed`: shows the Supabase project URL used by the function.
- `errorStage`: the exact stage where the function stopped.
- `errorMessage`: the safe error returned by Supabase or the function.

The diagnostic response never includes:

- user access token
- service role key
- anon key
- password
- full secret values

## Interpreting Common Failures

If `serviceRoleSecretPresent` is `false`, set the function secret:

```bash
supabase secrets set ADMIN_CREATE_USER_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy admin-create-user
```

If `serviceRoleSecretLooksLikeJwt` is `false`, the secret value is malformed.

If `serviceRoleClientProfileReadSucceeded` is `false` with a profiles permission error, the secret is usually the anon key, from the wrong Supabase project, or the deployed function is still old code.

If `adminProfileFound` is `false`, create or fix the caller's row in `public.profiles`.

If `adminRoleValue` is not `admin`, update the caller's profile role.

If `adminStatusValue` is not `active`, activate the caller's profile.

## Local Function Test

You can run the function locally with a local secrets file that is never committed:

```bash
supabase functions serve admin-create-user --env-file supabase/.env.local
```

Example local `supabase/.env.local`:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
ADMIN_CREATE_USER_SERVICE_ROLE_KEY=
```

Keep that file private.

## App Test

1. Log in as an active admin.
2. Open `/admin/users`.
3. Click `Test User Creation Setup`.
4. Confirm `serviceRoleClientProfileReadSucceeded` is `true`.
5. Fill the primary `Create Student or Teacher` form.
6. Click `Create User`.
7. Confirm the user appears in the grouped users list.
8. Log out and test the new user with the temporary password.

If the function is not deployed yet, the Admin Users page still includes the manual fallback:

1. Create the user in Supabase Auth.
2. Paste the Auth user ID into the fallback form.
3. Connect the profile row.

## Safety Rules

- Never expose privileged keys in frontend code.
- Never commit real secrets.
- Keep admin creation limited to active admin profiles.
- Keep public sign-up disabled unless the school intentionally changes that policy.
- Share temporary passwords only through an approved private channel.
