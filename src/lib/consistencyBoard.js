import { requireSupabaseClient } from "./supabaseClient.js";

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (
    message.toLowerCase().includes("get_consistency_board")
    || message.toLowerCase().includes("is_assigned_student")
  ) {
    return "The Consistency Board is being prepared. Please ask your school team to finish setup.";
  }

  return "Could not load the Consistency Board. Please try again.";
}

function mapBoardRow(row) {
  return {
    period: row.period,
    studentId: row.student_id,
    displayName: row.display_name || "Student",
    rank: Number(row.rank_position) || 0,
    isCurrentUser: Boolean(row.is_current_user),
    isAssignedStudent: Boolean(row.is_assigned_student),
    points: Number(row.points) || 0,
    weeklyPoints: Number(row.weekly_points) || 0,
    monthlyPoints: Number(row.monthly_points) || 0,
    yearlyPoints: Number(row.yearly_points) || 0,
    completionRate: Number(row.completion_rate) || 0,
    submittedTaskCount: Number(row.submitted_task_count) || 0,
    currentStreak: Number(row.current_streak) || 0,
    activeDays: Number(row.active_days) || 0,
    badges: Array.isArray(row.badges) ? row.badges.filter(Boolean) : []
  };
}

export async function getConsistencyBoard() {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc("get_consistency_board");

    if (error) {
      return {
        rows: [],
        error: normalizeError(error)
      };
    }

    return {
      rows: (data || []).map(mapBoardRow),
      error: null
    };
  } catch (error) {
    return {
      rows: [],
      error: normalizeError(error)
    };
  }
}
