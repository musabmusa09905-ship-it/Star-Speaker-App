# Production Test Checklist

Use this checklist after deploying the Heart of English Habit App.

## Admin Test

- Log in as an admin.
- Open `/admin/users`.
- Open `/admin/library`.
- Open `/admin/relationships`.
- Open `/leaderboard`.
- Confirm real users load from `public.profiles`.
- Link an active teacher to an active student.
- Confirm duplicate teacher-student links are prevented or handled safely.
- Create or update a library resource.
- Confirm the resource is active before checking student Library.

## Teacher Test

- Log in as a teacher.
- Open `/teacher/students`.
- Confirm only assigned students are visible.
- Edit an assigned student's learning profile.
- Open `/teacher/assign`.
- Assign a speaking task to an assigned student.
- Open `/teacher/tasks`.
- Confirm the assigned task appears.
- Open `/teacher/review`.
- Review a submitted recording and submit feedback.
- Open `/teacher/weekly-focus`.
- Set a weekly focus for an assigned student.
- Open `/teacher/library`.
- Create or edit a teacher-owned library resource.
- Open `/leaderboard`.
- Confirm the teacher sees the school Top 10 and assigned-student consistency section.

## Student Test

- Log in as a student.
- Open `/home`.
- Confirm today's speaking habit uses real data.
- Open `/practice`.
- Confirm assigned tasks and filters work.
- Open a task from Practice.
- Record and submit a speaking task.
- Open `/feedback`.
- Confirm the submitted recording appears.
- Confirm private playback works through a signed URL.
- Confirm teacher feedback appears after review.
- Open `/library`.
- Confirm active resources appear.
- Open `/leaderboard`.
- Confirm Top 10 and private own-position card appear.
- Open `/progress`.
- Confirm metrics, streaks, activity, and badges use real submission data.
- Open `/profile`.
- Confirm learning profile and weekly focus reflect teacher updates.

## Security Test

- Confirm a logged-out user redirects to `/login`.
- Confirm a student cannot access teacher pages.
- Confirm a student cannot access admin pages.
- Confirm a teacher cannot access admin pages.
- Confirm blocked routes show clear access messages, not blank screens.
- Confirm private teacher feedback does not appear on the Consistency Board.
- Confirm clarity, confidence, and accuracy scores do not appear on the public board.
- Confirm emails do not appear on the public Consistency Board.
- Confirm the frontend does not include a Supabase `service_role` key.

## Data Test

- Confirm a task assigned by a teacher appears for the student.
- Confirm a student submission appears in Teacher Review.
- Confirm teacher feedback appears in Student Feedback.
- Confirm weekly focus appears on Student Home, Profile, and Progress.
- Confirm a library resource appears for students after creation.
- Confirm Teacher Assign can prefill from a library resource.
- Confirm the Consistency Board updates after submissions.
- Confirm habit badges update after submissions.

## Deployment Checks

- Confirm production environment variables are set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Confirm `.env.local` is not committed.
- Confirm route refreshes work for app routes, or that the host has an SPA fallback configured.
- Confirm the `voice-submissions` bucket remains private.
