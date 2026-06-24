import { requireSupabaseClient } from "./supabaseClient.js";
import { getStudentLearningOverview } from "./studentLearningProfile.js";
import { getStudentReminderPreferences } from "./studentReminders.js";
import { getWritingStudentOverview } from "./writingPractice.js";

const assignedTaskColumns = [
  "id",
  "student_id",
  "title",
  "description",
  "instructions",
  "task_type",
  "estimated_minutes",
  "level",
  "focus",
  "due_date",
  "status",
  "guiding_phrases",
  "checklist",
  "created_at"
].join(", ");

const submissionColumns = [
  "id",
  "assigned_task_id",
  "student_id",
  "duration_seconds",
  "self_rating",
  "reflection_text",
  "submitted_at",
  "status"
].join(", ");

const feedbackColumns = [
  "id",
  "submission_id",
  "assigned_task_id",
  "student_id",
  "teacher_comment",
  "correction_note",
  "encouragement_note",
  "next_focus",
  "created_at"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load your home dashboard. Please try again.";
}

export async function getStudentHomeDashboard(studentId) {
  try {
    const client = requireSupabaseClient();
    const [
      { data: tasks, error: tasksError },
      { data: submissions, error: submissionsError },
      { data: feedback, error: feedbackError },
      learningOverview,
      reminderResult,
      writingOverview
    ] = await Promise.all([
      client
        .from("assigned_tasks")
        .select(assignedTaskColumns)
        .eq("student_id", studentId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      client
        .from("submissions")
        .select(submissionColumns)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false }),
      client
        .from("feedback")
        .select(feedbackColumns)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      getStudentLearningOverview(studentId),
      getStudentReminderPreferences(studentId),
      getWritingStudentOverview(studentId)
    ]);

    if (tasksError || submissionsError || feedbackError || learningOverview.error || reminderResult.error) {
      return {
        tasks: [],
        submissions: [],
        feedback: [],
        weeklyFocus: null,
        learningProfile: null,
        reminderPreferences: null,
        writing: { tasks: [], submissions: [], stats: null, error: writingOverview.error || null },
        error: normalizeError(tasksError || submissionsError || feedbackError || learningOverview.error || reminderResult.error)
      };
    }

    return {
      tasks: tasks || [],
      submissions: submissions || [],
      feedback: feedback || [],
      weeklyFocus: learningOverview.weeklyFocus,
      learningProfile: learningOverview.profile,
      reminderPreferences: reminderResult.preferences,
      writing: writingOverview,
      error: null
    };
  } catch (error) {
    return {
      tasks: [],
      submissions: [],
      feedback: [],
      weeklyFocus: null,
      learningProfile: null,
      reminderPreferences: null,
      writing: { tasks: [], submissions: [], stats: null, error: null },
      error: normalizeError(error)
    };
  }
}
