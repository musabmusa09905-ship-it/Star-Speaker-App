# Notification Event Engine

This foundation creates pending `notification_events` only. It does not send push notifications, email, WhatsApp, or any external message.

## Edge Function

Path:

```text
supabase/functions/create-notification-events/index.ts
```

Deploy:

```bash
supabase functions deploy create-notification-events --no-verify-jwt
```

## Required Secrets

Set these in Supabase Edge Function secrets. Do not commit real values.

```bash
supabase secrets set APP_URL=https://your-live-app-url
supabase secrets set NOTIFICATION_ENGINE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set NOTIFICATION_ENGINE_SECRET=your-random-run-secret
```

`NOTIFICATION_ENGINE_SERVICE_ROLE_KEY` is used only inside the Edge Function. Never add it to Vercel frontend environment variables.
`SUPABASE_URL` is provided by Supabase Edge Functions automatically. If your project does not expose it, set it as a function secret. The event creator does not require `SUPABASE_ANON_KEY` because JWT verification is disabled and manual runs are protected by `x-notification-secret`.

The function validates that `NOTIFICATION_ENGINE_SERVICE_ROLE_KEY` is a real Supabase `service_role` JWT before querying protected tables such as `submissions`, `writing_submissions`, `assigned_tasks`, and `notification_events`. It also runs a protected-table self-check with the service-role client before executing a slot. If this secret accidentally contains the anon key, or the deployed function is not using service-role access correctly, the function returns a safe configuration error instead of weakening RLS.

The function returns JSON for every normal response:

```json
{
  "ok": true,
  "slot": "student_afternoon_missing",
  "dryRun": true,
  "checked": 0,
  "created": 0,
  "skipped": {
    "completed": 0,
    "duplicate": 0,
    "noPreference": 0,
    "noTask": 0,
    "noData": 0
  },
  "errors": []
}
```

If a required secret is missing, the response is:

```json
{
  "ok": false,
  "error": "Missing required environment variable: NAME",
  "details": "Set the missing value in Supabase Edge Function secrets. Do not commit secret values."
}
```

If `x-notification-secret` is missing or incorrect, the response is:

```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

## Manual Dry Run

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-notification-events" \
  -H "Content-Type: application/json" \
  -H "x-notification-secret: YOUR_NOTIFICATION_ENGINE_SECRET" \
  -d '{"slot":"student_afternoon_missing","dryRun":true}'
```

PowerShell:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-notification-events" `
  -Headers @{ "x-notification-secret" = "YOUR_NOTIFICATION_ENGINE_SECRET" } `
  -ContentType "application/json" `
  -Body '{"slot":"student_afternoon_missing","dryRun":true}'
```

## Manual Create

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-notification-events" \
  -H "Content-Type: application/json" \
  -H "x-notification-secret: YOUR_NOTIFICATION_ENGINE_SECRET" \
  -d '{"slot":"student_afternoon_missing","dryRun":false}'
```

PowerShell:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-notification-events" `
  -Headers @{ "x-notification-secret" = "YOUR_NOTIFICATION_ENGINE_SECRET" } `
  -ContentType "application/json" `
  -Body '{"slot":"student_afternoon_missing","dryRun":false}'
```

## Recommended Schedule

Use `run-scheduled-notification-slot` for production scheduling. It calls this event creator first, then calls `send-push-notifications` for the same slot. See [scheduled-push-reminders.md](scheduled-push-reminders.md) for deploy commands, secrets, and Supabase cron SQL.

If you run functions manually, create events first and then run `send-push-notifications` to deliver pending push notifications.

09:00 Europe/Istanbul:

- `student_morning_ready`
- then run `send-push-notifications`

13:30 Europe/Istanbul:

- `student_afternoon_missing`
- then run `send-push-notifications`

19:00 Europe/Istanbul:

- `student_evening_missing`
- `teacher_review_waiting`
- `teacher_writing_review_waiting`
- `teacher_students_need_reminder`
- `admin_students_need_reminder`
- `admin_review_backlog`
- `admin_pending_users`
- then run `send-push-notifications`

Optional every few hours:

- `student_unread_message`
- `teacher_unread_message`

Skipped for now:

- `student_feedback_ready`: the app does not currently track feedback viewed/unviewed state safely.
- `admin_unread_message`: the current support messaging model is student-teacher thread based, not admin inbox based.

## Duplicate Protection

The database prevents repeated same-day events with:

```text
unique(user_id, notification_type, notification_slot, notification_date)
```

Running the same slot more than once on the same date will skip duplicates.
