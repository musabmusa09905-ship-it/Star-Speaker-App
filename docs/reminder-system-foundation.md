# Reminder System Foundation

This phase adds the in-app reminder foundation for Heart of English. It stores each student's reminder preferences and shows calm, habit-focused reminder messages inside the app.

## What This Phase Does

- Stores student reminder preferences in `public.student_reminder_preferences`.
- Lets students enable or disable morning, midday, evening, night, and positive reinforcement reminders.
- Shows a student Home reminder card based on real task and submission state.
- Shows completion reinforcement after the student submits a speaking task today.
- Lets teachers see whether assigned students have reminders enabled.

This foundation started as an in-app behavior system. The email reminder phase now extends the
same `student_reminder_preferences` table with email opt-in settings and sends email only from a
Supabase Edge Function.

## What This Phase Does Not Add

- Browser push notifications
- Mobile push notifications
- Service workers
- Push API subscriptions
- VAPID keys
- WhatsApp or SMS delivery
- Browser push delivery

## Future Push Notification Phase

A later push notification phase should add these pieces carefully:

- Browser notification permission flow
- Service worker registration
- Push API subscription table
- VAPID public/private keys stored only in secure backend configuration
- Scheduled Supabase Edge Function or cron job
- Notification delivery logs
- Unsubscribe and quiet-hour behavior
- Teacher/admin visibility into notification health without exposing secrets

## Safety Notes

- Do not store notification secrets in frontend code.
- Do not add VAPID private keys to Vite environment variables.
- Do not send push notifications until students have explicitly granted browser permission.
- Keep reminder language calm, constructive, and non-shaming.
- Keep the current private feedback and performance score rules unchanged.

The current foundation improves student habit behavior inside the app without adding risky notification infrastructure too early.
