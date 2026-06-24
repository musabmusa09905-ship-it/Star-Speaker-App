# Live Deployment Test Plan

Use this plan after deploying the Heart of English Habit App to the live host.

## 1. Deploy The App

- Push the latest code to GitHub.
- Connect the repository to the hosting platform.
- Use the production build command:

```bash
npm run build
```

- Confirm the build output folder is:

```text
dist
```

## 2. Add Production Environment Variables

Add these variables in the hosting platform dashboard before the production build:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the Supabase anon key only. Do not add a `service_role` key to the frontend host.

## 3. Open The Live URL

- Open the deployed URL.
- Confirm the app loads without a blank screen.
- Open `/login` directly.
- Refresh `/login` and confirm it still loads.
- Open a nested route such as `/teacher/review` while logged out and confirm it redirects to login or shows the safe login flow.

## 4. Admin Login Test

- Log in as an admin.
- Open `/admin/users`.
- Open `/admin/library`.
- Open `/admin/relationships`.
- Open `/leaderboard`.
- Confirm admin pages load real data from Supabase.
- Confirm admin can link an active student to an active teacher.
- Confirm admin can create or update a library resource.

## 5. Teacher Login Test

- Log in as a teacher.
- Open `/teacher/students`.
- Open `/teacher/assign`.
- Assign a speaking task to an assigned student.
- Open `/teacher/tasks`.
- Confirm the assigned task appears.
- Open `/teacher/review`.
- Review a submitted recording when one exists.
- Open `/teacher/weekly-focus`.
- Set a weekly focus for an assigned student.
- Open `/teacher/library`.
- Open `/leaderboard`.

## 6. Student Login Test

- Log in as a student.
- Open `/home`.
- Open `/practice`.
- Confirm the assigned task appears.
- Open the task from Practice.
- Record a short test answer.
- Submit the recording.
- Open `/feedback`.
- Confirm the submitted recording appears.
- Confirm playback uses the private signed URL flow.
- Open `/library`.
- Confirm active resources appear.
- Open `/leaderboard`.
- Open `/progress`.
- Open `/profile`.

## 7. Audio Upload Test

- Confirm the browser asks for microphone permission.
- Record and stop a short answer.
- Preview the recording locally.
- Submit the recording.
- Confirm the upload completes without a fake success message.
- Confirm the row appears in `public.submissions`.
- Confirm `assigned_tasks.status` changes to `submitted`.
- Confirm the file path is stored in `audio_path`.
- Confirm no public URL is stored.

## 8. Teacher Review Test

- Log in as the assigned teacher.
- Open `/teacher/review`.
- Confirm the student's submitted recording appears.
- Play the private recording.
- Submit feedback.
- Confirm `public.feedback` receives a real row.
- Confirm the submission and task status become `reviewed`.

## 9. Student Feedback Test

- Log back in as the student.
- Open `/feedback`.
- Confirm teacher feedback appears.
- Confirm correction, encouragement, next focus, and scores render only for the student.
- Confirm private playback still works.

## 10. Leaderboard Test

- Open `/leaderboard` as student.
- Confirm the student sees Top 10 plus their own private position.
- Open `/leaderboard` as teacher.
- Confirm teacher sees Top 10 plus assigned students.
- Open `/leaderboard` as admin.
- Confirm admin sees the full school consistency list.
- Confirm the board does not show emails, private feedback, corrections, levels, or teacher score details.

## 11. Library Test

- Create an active resource as admin or teacher.
- Open `/library` as student.
- Confirm the real resource appears.
- Open `/teacher/assign`.
- Select the library resource.
- Confirm it prefills the task form without assigning automatically.

## 12. Blocked Route Security Test

- While logged out, open `/teacher/review` and `/admin/users`.
- Confirm the app redirects to login or shows the safe login flow.
- As a student, open `/teacher/review`, `/teacher/assign`, and `/admin/users`.
- Confirm access is blocked with a clear message.
- As a teacher, open `/admin/users` and `/admin/library`.
- Confirm access is blocked with a clear message.

## 13. Mobile View Test

- Test the live app around 390px and 430px wide.
- Confirm bottom navigation is visible for student pages.
- Confirm teacher/admin navigation remains usable.
- Confirm recording controls fit the screen.
- Confirm Library, Feedback, Progress, and Leaderboard cards do not overlap.

## 14. Final Safety Checks

- Confirm `.env.local` is not committed.
- Confirm the frontend host has only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Confirm no `service_role` key is present in frontend environment variables.
- Confirm the `voice-submissions` bucket remains private.
- Confirm live route refreshes work on nested routes.
