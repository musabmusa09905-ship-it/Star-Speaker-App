-- Web push delivery status fields for pending notification events.
-- This enables the sender Edge Function to mark delivery attempts without
-- changing the event creation engine.

begin;

alter table public.notification_events
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists attempts integer not null default 0 check (attempts >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists delivery_summary jsonb not null default '{}'::jsonb;

alter table public.notification_events
  drop constraint if exists notification_events_status_check;

alter table public.notification_events
  add constraint notification_events_status_check
  check (
    status in (
      'pending',
      'sending',
      'sent',
      'partially_sent',
      'failed',
      'skipped_no_subscription',
      'skipped_duplicate',
      'skipped',
      'cancelled',
      'sent_later',
      'failed_later'
    )
  );

create index if not exists notification_events_pending_idx
  on public.notification_events (created_at)
  where status = 'pending';

create index if not exists notification_events_last_attempt_idx
  on public.notification_events (last_attempt_at desc nulls last);

commit;
