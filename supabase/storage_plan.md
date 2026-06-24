# Heart of English Storage Plan

This step does not create or expose storage buckets. Voice recordings should remain private by default.

## Future Bucket

- Bucket name: `voice-submissions`
- Public access: `false`
- Intended file type: student voice recordings, likely `.webm`
- Future path pattern: `students/{student_id}/tasks/{assigned_task_id}/{submission_id}.webm`

## Future Access Rules

- Students can upload/read only their own voice submissions.
- Assigned teachers can read recordings for their assigned students.
- Admins can manage all recordings.
- Public URLs should not be used for private student voice data.

Storage policies should be added in a later step when the recording/upload flow is implemented.
