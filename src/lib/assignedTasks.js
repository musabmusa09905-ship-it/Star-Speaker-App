import { requireSupabaseClient } from "./supabaseClient.js";

const assignedTaskColumns = [
  "id",
  "student_id",
  "teacher_id",
  "template_id",
  "title",
  "description",
  "task_type",
  "instructions",
  "guiding_phrases",
  "checklist",
  "estimated_minutes",
  "level",
  "focus",
  "due_date",
  "status",
  "created_at",
  "updated_at"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load practice tasks. Please try again.";
}

export async function getAssignedTasksForStudent(studentId) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("assigned_tasks")
      .select(assignedTaskColumns)
      .eq("student_id", studentId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    return {
      tasks: data || [],
      error: normalizeError(error)
    };
  } catch (error) {
    return {
      tasks: [],
      error: normalizeError(error)
    };
  }
}

export async function getAssignedTaskById(taskId) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("assigned_tasks")
      .select(assignedTaskColumns)
      .eq("id", taskId)
      .maybeSingle();

    return {
      task: data || null,
      error: normalizeError(error)
    };
  } catch (error) {
    return {
      task: null,
      error: normalizeError(error)
    };
  }
}
