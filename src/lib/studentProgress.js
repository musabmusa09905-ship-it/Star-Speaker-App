import { requireSupabaseClient } from "./supabaseClient.js";
import { getStudentLearningOverview } from "./studentLearningProfile.js";

const assignedTaskColumns = [
  "id",
  "student_id",
  "title",
  "task_type",
  "focus",
  "level",
  "due_date",
  "status",
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
  "clarity_score",
  "confidence_score",
  "accuracy_score",
  "next_focus",
  "created_at"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load progress. Please try again.";
}

export async function getStudentProgressData(studentId) {
  try {
    const client = requireSupabaseClient();
    const [
      { data: tasks, error: tasksError },
      { data: submissions, error: submissionsError },
      { data: feedback, error: feedbackError },
      learningOverview
    ] = await Promise.all([
      client
        .from("assigned_tasks")
        .select(assignedTaskColumns)
        .eq("student_id", studentId)
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
      getStudentLearningOverview(studentId)
    ]);

    if (tasksError || submissionsError || feedbackError || learningOverview.error) {
      return {
        tasks: [],
        submissions: [],
        feedback: [],
        weeklyFocus: null,
        learningProfile: null,
        error: normalizeError(tasksError || submissionsError || feedbackError || learningOverview.error)
      };
    }

    return {
      tasks: tasks || [],
      submissions: submissions || [],
      feedback: feedback || [],
      weeklyFocus: learningOverview.weeklyFocus,
      learningProfile: learningOverview.profile,
      error: null
    };
  } catch (error) {
    return {
      tasks: [],
      submissions: [],
      feedback: [],
      weeklyFocus: null,
      learningProfile: null,
      error: normalizeError(error)
    };
  }
}
