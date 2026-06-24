-- Instant notification event uniqueness.
-- Scheduled reminders stay unique by user/type/slot/date, while instant events
-- are deduplicated by the source row recorded in metadata.

begin;

alter table public.notification_events
  drop constraint if exists notification_events_user_slot_date_unique;

create unique index if not exists notification_events_scheduled_user_slot_date_unique
  on public.notification_events (user_id, notification_type, notification_slot, notification_date)
  where not (metadata ? 'sourceId');

create unique index if not exists notification_events_instant_source_unique
  on public.notification_events (
    user_id,
    notification_type,
    notification_slot,
    ((metadata ->> 'sourceType')),
    ((metadata ->> 'sourceId'))
  )
  where metadata ? 'sourceType' and metadata ? 'sourceId';

commit;
