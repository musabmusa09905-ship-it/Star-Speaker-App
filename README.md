# Heart of English Habit App

Heart of English Habit App is a teacher-controlled English speaking habit app. Teachers assign focused daily speaking tasks, students record and submit voice answers, and teachers review recordings with useful feedback.

## Current Features

- Supabase Auth login for admin, teacher, and student accounts
- Role-based access for student and teacher workflows
- Teacher task assignment
- Student Daily Practice page with real assigned tasks
- Browser audio recording with local preview
- Private Supabase Storage upload for submitted recordings
- Student submission playback through short-lived signed URLs
- Teacher Review page for submitted recordings
- Real teacher feedback stored in Supabase
- Student feedback history with submitted recordings and review status

## Tech Stack

- Vite
- React
- Supabase Auth
- Supabase Database
- Supabase Storage

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
.env.local
```

Add the required variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

An `.env.example` file is included with placeholder variable names only.

Start the local development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

For deployment routing and environment notes, see `docs/deployment-notes.md`.
For live QA after deployment, see `docs/production-test-checklist.md`.

## Supabase Notes

The app expects the Supabase database migrations in `supabase/migrations/` to be applied before real data workflows are used.

The private Storage bucket for voice recordings is:

```text
voice-submissions
```

This bucket must remain private. Playback should use signed URLs only.

## Security Notes

- Do not commit `.env.local`.
- Do not commit real keys, passwords, emails, or private credentials.
- Do not use a Supabase `service_role` key in frontend code.
- Keep the `voice-submissions` bucket private.
- Use the public anon key only with Row Level Security policies enabled.
