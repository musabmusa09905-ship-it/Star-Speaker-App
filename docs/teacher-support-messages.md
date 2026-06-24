# Teacher Support Messages

This feature is a controlled teacher-support messaging MVP for Heart of English.

It is not real-time chat. It is a focused support thread between a student and their assigned teacher.

## Product Intent

Teacher Support helps students ask focused questions about:

- teacher-assigned speaking tasks
- teacher feedback
- weekly focus
- speaking progress
- clarification before recording

The language should set healthy expectations:

- Your teacher will reply when available.
- Keep messages focused on your speaking progress.
- Use this space for task questions, feedback questions, and learning support.

Avoid wording that implies instant availability, such as live chat, instant reply, always online, or chat anytime.

## Access Model

- Students can contact only their assigned teacher.
- Teachers can reply only to students assigned to them through `public.teacher_students`.
- Students cannot message other students.
- Teachers cannot see unassigned student conversations.
- Admin full conversation moderation is not included in this MVP.

## Data Model

The migration `supabase/migrations/0017_teacher_support_messages.sql` creates:

- `public.message_threads`
- `public.messages`

Both tables use Row Level Security. Browser code uses only the normal Supabase client and relies on RLS.

## Not Included Yet

- Real-time updates
- Typing indicators
- Online status
- Reactions
- Voice messages
- File attachments
- Push notification alerts
- Message templates
- Task-linked messages
- Support hours
- Teacher response-time expectations
- Admin moderation tools

## Future Improvements

Useful future steps may include:

- real-time thread updates
- admin moderation overview
- teacher response templates
- linking a thread to a task or feedback item
- push notification alerts
- school-defined support hours
- clear teacher response-time expectations

Keep the system learning-focused and calm. It should support speaking progress, not create pressure for teachers to reply instantly.
