# Scheduled Push Reminders

This document wires the existing notification event creator and push sender into a scheduled production flow.

The scheduler does not weaken RLS and does not expose service-role keys to the frontend. It runs only in Supabase Edge Functions and is protected by `x-notification-secret`.

## Functions

Deploy all three functions:

```bash
supabase functions deploy create-notification-events --no-verify-jwt
supabase functions deploy send-push-notifications --no-verify-jwt
supabase functions deploy run-scheduled-notification-slot --no-verify-jwt
```

## Required Secrets

Set these in Supabase Edge Function secrets. Do not commit real values.

```bash
supabase secrets set APP_URL=https://your-live-app-url
supabase secrets set NOTIFICATION_ENGINE_SECRET=your-random-run-secret
supabase secrets set NOTIFICATION_ENGINE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set PUSH_NOTIFICATION_SECRET=your-random-push-secret
supabase secrets set PUSH_NOTIFICATION_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set VAPID_PUBLIC_KEY=your-vapid-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-vapid-private-key
supabase secrets set VAPID_SUBJECT=mailto:admin@example.com
```

`run-scheduled-notification-slot` uses `NOTIFICATION_ENGINE_SECRET` to call `create-notification-events` and `PUSH_NOTIFICATION_SECRET` to call `send-push-notifications`. Service-role keys stay inside the called Edge Functions.

## Slots

Student slots:

- `student_morning_ready`
- `student_afternoon_missing`
- `student_evening_missing`

Teacher slots:

- `teacher_review_waiting`
- `teacher_writing_review_waiting`
- `teacher_students_need_reminder`

Admin slots:

- `admin_students_need_reminder`
- `admin_review_backlog`
- `admin_pending_users`

The student missing-task slots count a student as complete if they have either a speaking submission or a writing submission today in `Europe/Istanbul`.

For students assigned to teacher Musab, the afternoon/evening missing-task copy rotates through the five Musab-style messages using the local notification date. The rotation number is stored in event metadata as `musabRotationNumber`.

## Manual Dry Run

PowerShell:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot" `
  -Headers @{ "x-notification-secret" = "YOUR_NOTIFICATION_ENGINE_SECRET" } `
  -ContentType "application/json" `
  -Body '{"slot":"student_afternoon_missing","dryRun":true,"limit":25}'
```

Expected shape:

```json
{
  "ok": true,
  "slot": "student_afternoon_missing",
  "dryRun": true,
  "created": 0,
  "wouldCreate": 1
}
```

## Manual Live Run

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot" `
  -Headers @{ "x-notification-secret" = "YOUR_NOTIFICATION_ENGINE_SECRET" } `
  -ContentType "application/json" `
  -Body '{"slot":"student_afternoon_missing","dryRun":false,"limit":25}'
```

## Supabase Cron Setup

Run this SQL manually in Supabase SQL Editor only when you are ready to enable automatic scheduled pushes.

Supabase cron typically runs in UTC. Istanbul is UTC+3, so the UTC times below match the requested Europe/Istanbul schedule.

Replace `YOUR_PROJECT_REF` and `YOUR_NOTIFICATION_ENGINE_SECRET` first.

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'hoe-student-morning-ready',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'student_morning_ready', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-student-afternoon-missing',
  '30 10 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'student_afternoon_missing', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-student-evening-missing',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'student_evening_missing', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-teacher-review-waiting',
  '15 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'teacher_review_waiting', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-teacher-writing-review-waiting',
  '20 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'teacher_writing_review_waiting', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-teacher-students-need-reminder',
  '25 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'teacher_students_need_reminder', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-admin-students-need-reminder',
  '30 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'admin_students_need_reminder', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-admin-review-backlog',
  '31 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'admin_review_backlog', 'dryRun', false, 'limit', 25)
  );
  $$
);

select cron.schedule(
  'hoe-admin-pending-users',
  '32 16 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/run-scheduled-notification-slot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', 'YOUR_NOTIFICATION_ENGINE_SECRET'
    ),
    body := jsonb_build_object('slot', 'admin_pending_users', 'dryRun', false, 'limit', 25)
  );
  $$
);
```

## Safety Notes

- Do not put service-role keys in Vercel.
- Do not make `submissions`, `assigned_tasks`, or notification tables publicly readable.
- Keep `x-notification-secret` private.
- `dryRun: true` never inserts `notification_events`.
- Duplicate same-day scheduled notifications are prevented by the scheduled unique index in `0034_instant_notification_events.sql`.
