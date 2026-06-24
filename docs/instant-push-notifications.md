# Instant Push Notifications

This adds event-based push notifications for actions that already succeeded in the app:

- student speaking submission: `speaking_submitted` / `instant_speaking_submission`
- student writing submission: `writing_submitted` / `instant_writing_submission`
- teacher speaking or writing feedback: `feedback_ready` / `instant_feedback_ready`
- teacher/student support message: `message_received` / `instant_message_received`

The frontend never sends push secrets and never calls the scheduled push sender directly. It calls the authenticated Edge Function `dispatch-instant-notification` with a source row id, and the function verifies the action before creating and sending a notification.

## Edge Function

Path:

```text
supabase/functions/dispatch-instant-notification/index.ts
```

Deploy:

```bash
supabase functions deploy dispatch-instant-notification
```

## Required Supabase Edge Function secrets

These belong in Supabase Edge Function secrets only, not in Vercel frontend variables:

```bash
supabase secrets set PUSH_NOTIFICATION_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set VAPID_PUBLIC_KEY=your-vapid-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-vapid-private-key
supabase secrets set VAPID_SUBJECT=mailto:admin@example.com
```

The function also uses Supabase-provided runtime values:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

## SQL

Run this migration before relying on multiple instant notifications per day:

```text
supabase/migrations/0034_instant_notification_events.sql
```

It replaces the old day-level notification uniqueness with:

- scheduled reminder uniqueness by user/type/slot/date
- instant notification uniqueness by user/type/slot/sourceType/sourceId

It does not change RLS policies.

## Frontend behavior

The app dispatches instant notifications only after the original action succeeds. Notification failure is logged but does not block the user action.

## Manual test examples

Use a real logged-in browser flow first:

1. Enable push notifications for a teacher account.
2. Log in as an assigned student.
3. Submit a speaking task.
4. Confirm the teacher receives a push notification or the `notification_events` row is marked `skipped_no_subscription`.

You can also invoke the function with a logged-in user bearer token:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/dispatch-instant-notification" \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"speaking_submitted","sourceId":"SUBMISSION_ID"}'
```

Never use the service-role key in this test command.

## Verification query

Run this in Supabase SQL editor after a real app action:

```sql
select
  ne.id,
  ne.user_id,
  u.email as recipient_email,
  ne.notification_type,
  ne.notification_slot,
  ne.title,
  ne.body,
  ne.status,
  ne.attempts,
  ne.error_message,
  ne.created_at,
  ne.sent_at,
  ne.metadata
from notification_events ne
left join auth.users u on u.id = ne.user_id
where ne.created_at > now() - interval '30 minutes'
order by ne.created_at desc;
```
