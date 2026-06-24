import { requireSupabaseClient } from "./supabaseClient.js";

const weeklyPlanColumns = [
  "id",
  "student_id",
  "teacher_id",
  "week_start",
  "week_end",
  "weekly_focus",
  "notes",
  "status",
  "created_at",
  "updated_at"
].join(", ");

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load weekly focus. Please try again.";
  }

  return message;
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

async function verifyTeacherStudent(client, teacherId, studentId) {
  const { data, error } = await client
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return {
      isAssigned: false,
      error: normalizeError(error)
    };
  }

  return {
    isAssigned: Boolean(data),
    error: null
  };
}

export function parseWeeklyPlanNotes(notes) {
  if (!notes) {
    return {
      focusNote: "",
      targetDescription: ""
    };
  }

  try {
    const parsed = JSON.parse(notes);

    if (parsed && typeof parsed === "object") {
      return {
        focusNote: parsed.focusNote || parsed.focus_note || "",
        targetDescription: parsed.targetDescription || parsed.target_description || ""
      };
    }
  } catch {
    return {
      focusNote: notes,
      targetDescription: ""
    };
  }

  return {
    focusNote: notes,
    targetDescription: ""
  };
}

export function mapWeeklyPlan(plan) {
  if (!plan) {
    return null;
  }

  const parsedNotes = parseWeeklyPlanNotes(plan.notes);
  const focusTitle = plan.focus_title || plan.weekly_focus || "";

  return {
    ...plan,
    focusTitle,
    focus_title: focusTitle,
    focusNote: parsedNotes.focusNote,
    focus_note: parsedNotes.focusNote,
    targetDescription: parsedNotes.targetDescription,
    target_description: parsedNotes.targetDescription,
    active: plan.active ?? plan.status === "active"
  };
}

export function serializeWeeklyPlanNotes({ focusNote, targetDescription }) {
  return JSON.stringify({
    focusNote: focusNote?.trim() || "",
    targetDescription: targetDescription?.trim() || ""
  });
}

export async function getLatestWeeklyFocusForStudent(studentId) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("weekly_plans")
      .select(weeklyPlanColumns)
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return {
        weeklyFocus: null,
        error: normalizeError(error)
      };
    }

    return {
      weeklyFocus: mapWeeklyPlan(data?.[0] || null),
      error: null
    };
  } catch (error) {
    return {
      weeklyFocus: null,
      error: normalizeError(error)
    };
  }
}

export async function createWeeklyFocusForTeacher({ teacherId, values }) {
  try {
    const client = requireSupabaseClient();
    const studentId = values.student_id;

    if (!teacherId || !studentId) {
      return {
        weeklyFocus: null,
        error: "Choose an assigned student before setting weekly focus."
      };
    }

    const assignment = await verifyTeacherStudent(client, teacherId, studentId);

    if (assignment.error) {
      return {
        weeklyFocus: null,
        error: assignment.error
      };
    }

    if (!assignment.isAssigned) {
      return {
        weeklyFocus: null,
        error: "You can only set weekly focus for your assigned students."
      };
    }

    const focusTitle = values.focus_title?.trim();

    if (!focusTitle) {
      return {
        weeklyFocus: null,
        error: "Focus title is required."
      };
    }

    if (!values.week_start || Number.isNaN(new Date(`${values.week_start}T00:00:00`).getTime())) {
      return {
        weeklyFocus: null,
        error: "Choose a valid week start date."
      };
    }

    const { data, error } = await client
      .from("weekly_plans")
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        week_start: values.week_start,
        week_end: addDays(values.week_start, 6),
        weekly_focus: focusTitle,
        notes: serializeWeeklyPlanNotes({
          focusNote: values.focus_note,
          targetDescription: values.target_description
        }),
        status: values.active ? "active" : "planned"
      })
      .select(weeklyPlanColumns)
      .single();

    if (error) {
      return {
        weeklyFocus: null,
        error: normalizeError(error)
      };
    }

    return {
      weeklyFocus: mapWeeklyPlan(data),
      error: null
    };
  } catch (error) {
    return {
      weeklyFocus: null,
      error: normalizeError(error)
    };
  }
}
