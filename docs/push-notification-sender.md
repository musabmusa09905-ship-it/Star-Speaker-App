# Push Notification Sender

This function sends real web push notifications from existing pending `notification_events`.

It does not create reminder logic. It does not send email or WhatsApp. It only sends pending events that were already created by `create-notification-events`.

## Edge Function

Path:

```text
supabase/functions/send-push-notifications/index.ts
```

Deploy:

```bash
supabase functions deploy send-push-notifications
```

## Required Secrets

Set these in Supabase Edge Function secrets. Do not commit real values.

```bash
supabase secrets set PUSH_NOTIFICATION_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set PUSH_NOTIFICATION_SECRET=your-random-run-secret
supabase secrets set VAPID_PUBLIC_KEY=your-vapid-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-vapid-private-key
supabase secrets set VAPID_SUBJECT=mailto:admin@example.com
```

Notes:

- `VAPID_PRIVATE_KEY` must exist only in Supabase Edge Function secrets.
- `VITE_VAPID_PUBLIC_KEY` is the browser-facing public key and can be set in Vercel.
- Do not put `PUSH_NOTIFICATION_SERVICE_ROLE_KEY` or `VAPID_PRIVATE_KEY` in Vercel frontend environment variables.

## Manual Dry Run

Dry run all pending notifications:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-push-notifications" \
  -H "Content-Type: application/json" \
  -H "x-push-secret: YOUR_PUSH_NOTIFICATION_SECRET" \
  -d '{"limit":25,"dryRun":true}'
```

Dry run one slot:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-push-notifications" \
  -H "Content-Type: application/json" \
  -H "x-push-secret: YOUR_PUSH_NOTIFICATION_SECRET" \
  -d '{"slot":"student_afternoon_missing","limit":10,"dryRun":true}'
```

## Manual Send

Send one specific notification event:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-push-notifications" \
  -H "Content-Type: application/json" \
  -H "x-push-secret: YOUR_PUSH_NOTIFICATION_SECRET" \
  -d '{"notificationId":"NOTIFICATION_EVENT_ID","dryRun":false}'
```

Send a limited batch:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-push-notifications" \
  -H "Content-Type: application/json" \
  -H "x-push-secret: YOUR_PUSH_NOTIFICATION_SECRET" \
  -d '{"slot":"student_afternoon_missing","limit":25,"dryRun":false}'
```

## Status Updates

The sender only selects events with `status = 'pending'`.

Before sending, it claims an event by changing:

```text
pending -> sending
```

After sending, it updates to one of:

- `sent`
- `partially_sent`
- `failed`
- `skipped_no_subscription`

This prevents the same pending event from being sent twice by concurrent runs.

## Invalid Subscriptions

If a subscription returns a gone/expired response such as HTTP `404` or `410`, the function marks that `push_subscriptions` row inactive:

```text
is_active = false
```

The event keeps a delivery summary in `notification_events.delivery_summary`.

## Recommended Schedule

Production flow:

1. Run `create-notification-events` for the slot.
2. Run `send-push-notifications` after it.

For production, prefer the wrapper function `run-scheduled-notification-slot`. It performs both steps for one slot and keeps the scheduled job small. See [scheduled-push-reminders.md](scheduled-push-reminders.md).

Example:

09:00 Europe/Istanbul:

- create `student_morning_ready`
- send pending push notifications

13:30 Europe/Istanbul:

- create `student_afternoon_missing`
- send pending push notifications

19:00 Europe/Istanbul:

- create evening, teacher review, and admin reminder events
- send pending push notifications
