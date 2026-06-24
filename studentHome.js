import { requireSupabaseClient } from "./supabaseClient.js";
import { mapWeeklyPlan } from "./weeklyFocus.js";

const assignedTaskColumns = [
  "id",
  "student_id",
  "title",
  "description",
  "task_type",
  "estimated_minutes",
  "level",
  "focus",
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
  "submitted_at",
  "status"
].join(", ");

const feedbackColumns = [
  "id",
  "submission_id",
  "assigned_task_id",
  "student_id",
  "teacher_comment",
  "next_focus",
  "created_at"
].join(", ");

const weeklyPlanColumns = [
  "id",
  "student_id",
  "weekly_focus",
  "notes",
  "status",
  "week_start",
  "week_end"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load your home dashboard. Please try again.";
  }

  return message;
}

export async function getStudentHomeDashboard(studentId) {
  try {
    const client = requireSupabaseClient();
    const [
      { data: tasks, error: tasksError },
      { data: submissions, error: submissionsError },
      { data: feedback, error: feedbackError },
      { data: weeklyPlans, error: weeklyPlansError }
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
      client
        .from("weekly_plans")
        .select(weeklyPlanColumns)
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("week_start", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    if (tasksError || submissionsError || feedbackError || weeklyPlansError) {
      return {
        tasks: [],
        submissions: [],
        feedback: [],
        weeklyPlan: null,
        error: normalizeError(tasksError || submissionsError || feedbackError || weeklyPlansError)
      };
    }

    return {
      tasks: tasks || [],
      submissions: submissions || [],
      feedback: feedback || [],
      weeklyPlan: mapWeeklyPlan(weeklyPlans?.[0] || null),
      error: null
    };
  } catch (error) {
    return {
      tasks: [],
      submissions: [],
      feedback: [],
      weeklyPlan: null,
      error: normalizeError(error)
    };
  }
}
