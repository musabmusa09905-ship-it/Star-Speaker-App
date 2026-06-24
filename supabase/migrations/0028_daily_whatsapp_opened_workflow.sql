-- Daily WhatsApp click-to-chat workflow status support.
-- This does not send WhatsApp messages. It only allows the app to record that
-- a prepared WhatsApp link was opened and handled by a teacher/admin.

begin;

alter table public.reminder_logs
  drop constraint if exists reminder_logs_status_check;

alter table public.reminder_logs
  add constraint reminder_logs_status_check
    check (status in (
      'queued',
      'sent',
      'skipped',
      'failed',
      'dry_run',
      'manual_marked',
      'opened',
      'duplicate_skipped'
    ));

commit;
