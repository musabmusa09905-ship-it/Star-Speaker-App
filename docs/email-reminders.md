# Daily Email Reminders

This phase adds warm daily email reminders for students who have a speaking or writing task due today and have not submitted anything today.

The browser app never sends email and never sees the service-role key. Email delivery runs inside the Supabase Edge Function:

`supabase/functions/send-daily-reminders/index.ts`

## What It Checks

- Active student profiles from `public.profiles`
- Email reminder settings from `public.student_reminder_preferences`
- Due speaking tasks from `public.assigned_tasks`
- Due writing tasks from `public.writing_tasks`
- Same-day speaking submissions from `public.submissions`
- Same-day writing submissions from `public.writing_submissions`
- Duplicate sends from `public.reminder_logs`

The function sends only when:

- the student is active
- the student has an email address
- in-app reminders are enabled
- email reminders are enabled
- at least one speaking or writing task is due today
- no speaking or writing submission exists today
- no email reminder log already exists for that student/date/type

## Required SQL

Run this migration in Supabase before testing the function:

`supabase/migrations/0023_daily_email_reminders.sql`

It adds email reminder preference fields and creates `public.reminder_logs`.

## Required Supabase Secrets

Set these in Supabase Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY="your-resend-api-key"
supabase secrets set REMINDER_FROM_EMAIL="Heart of English <reminders@your-domain.com>"
supabase secrets set APP_URL="https://your-live-app-url"
supabase secrets set REMINDER_CRON_SECRET="a-long-random-secret"
supabase secrets set REMINDER_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

Do not add `REMINDER_SERVICE_ROLE_KEY` to Vercel or frontend `.env.local`.

## Deploy Function

```bash
supabase functions deploy send-daily-reminders
```

## Manual Test

Dry run:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-daily-reminders" \
  -H "Content-Type: application/json" \
  -H "x-reminder-secret: YOUR_REMINDER_CRON_SECRET" \
  -d "{\"dryRun\":true}"
```

Real send:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-daily-reminders" \
  -H "Content-Type: application/json" \
  -H "x-reminder-secret: YOUR_REMINDER_CRON_SECRET" \
  -d "{}"
```

Expected JSON includes counts such as `sent`, `skippedCompleted`, `skippedNoTask`, `skippedOptedOut`, `skippedDuplicate`, and `failed`.

## Schedule At 18:00 Europe/Istanbul

18:00 Europe/Istanbul is 15:00 UTC.

Create a scheduled Supabase job from the SQL editor after replacing the project ref and secret:

```sql
select cron.schedule(
  'send-daily-reminders-istanbul',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/send-daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', 'YOUR_REMINDER_CRON_SECRET'
    ),
    body := jsonb_build_object('source', 'supabase-cron')
  );
  $$
);
```

If `pg_cron` or `pg_net` is not enabled in the project, enable them from Supabase first or use Supabase scheduled functions if available in your project plan.

## Provider Cost

Resend has a free tier, but production sending may require a verified domain and/or a paid plan depending on volume.
