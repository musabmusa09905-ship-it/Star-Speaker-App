# Heart of English Reminder System Plan

## Current MVP

The app stores each student's reminder preference as part of the real learning profile:

- `student_profiles.preferred_practice_time`
- `student_profiles.practice_duration_target`
- `student_profiles.practice_target`

The current frontend can safely show in-app reminder cues on the student Home page and learning-profile surfaces. Students can also opt in to warm daily email reminders from Profile.

Email delivery is handled only by the Supabase Edge Function in `supabase/functions/send-daily-reminders`. The frontend never sends email and never receives service-role credentials.

## Why Auth/Admin Creation Is Separate

The browser app must not create Auth users with elevated privileges. A future backend function can receive an admin request, validate the current admin session, create the Supabase Auth user server-side, and then insert the matching `public.profiles` row.

Until that backend exists, admins should create the Auth account in Supabase, then connect the public profile from the Admin Users page using the Auth user ID.

## Future Notification Architecture

The production reminder service runs outside the browser:

1. Read active student profiles with a preferred practice time.
2. Check whether the student has submitted at least one task today.
3. Send a reminder only when the student has not completed today's speaking habit.
4. Log delivery status in `public.reminder_logs`.
5. Keep notification content free of private teacher feedback or scores.

Possible backend options:

- Supabase Edge Function with a scheduled trigger.
- A trusted server worker.
- A school-approved messaging integration.

## Safety Rules

- Do not send reminders from the frontend.
- Do not expose private credentials in the app.
- Do not include teacher feedback, corrections, or performance scores in reminder messages.
- Keep the `voice-submissions` bucket private.
- Keep student reminder preferences editable only through authorized profile-management flows.
