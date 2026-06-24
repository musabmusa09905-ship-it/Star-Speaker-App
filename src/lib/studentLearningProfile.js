import { requireSupabaseClient } from "./supabaseClient.js";
import { mapWeeklyPlan } from "./weeklyFocus.js";

const studentProfileColumns = [
  "id",
  "user_id",
  "level",
  "main_goal",
  "speaking_focus",
  "pronunciation_focus",
  "vocabulary_focus",
  "practice_target",
  "practice_duration_target",
  "preferred_practice_time",
  "notes",
  "created_at",
  "updated_at"
].join(", ");

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

  return "Could not load your learning profile. Please try again.";
}

function cleanValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return value;
}

export function mapStudentLearningProfile(profile) {
  if (!profile) {
    return {
      level: null,
    mainGoal: null,
    speakingFocus: null,
    pronunciationFocus: null,
    vocabularyFocus: null,
    practiceTarget: null,
    practiceDurationTarget: null,
    preferredPracticeTime: null,
    teacherNote: null,
    updatedAt: null
    };
  }

  return {
    level: cleanValue(profile.level),
    mainGoal: cleanValue(profile.main_goal),
    speakingFocus: cleanValue(profile.speaking_focus),
    pronunciationFocus: cleanValue(profile.pronunciation_focus),
    vocabularyFocus: cleanValue(profile.vocabulary_focus),
    practiceTarget: cleanValue(profile.practice_target),
    practiceDurationTarget: profile.practice_duration_target ?? null,
    preferredPracticeTime: cleanValue(profile.preferred_practice_time),
    teacherNote: cleanValue(profile.notes),
    updatedAt: profile.updated_at || null
  };
}

export function mapWeeklyFocusForStudent(plan) {
  const mappedPlan = mapWeeklyPlan(plan);

  if (!mappedPlan) {
    return null;
  }

  return {
    focusTitle: cleanValue(mappedPlan.focusTitle),
    focusNote: cleanValue(mappedPlan.focusNote),
    targetDescription: cleanValue(mappedPlan.targetDescription),
    weekStart: mappedPlan.week_start || null,
    weekEnd: mappedPlan.week_end || null,
    createdAt: mappedPlan.created_at || null,
    updatedAt: mappedPlan.updated_at || null
  };
}

export async function getStudentLearningProfile(studentId) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("student_profiles")
      .select(studentProfileColumns)
      .eq("user_id", studentId)
      .maybeSingle();

    if (error) {
      return {
        profile: mapStudentLearningProfile(null),
        error: normalizeError(error)
      };
    }

    return {
      profile: mapStudentLearningProfile(data),
      error: null
    };
  } catch (error) {
    return {
      profile: mapStudentLearningProfile(null),
      error: normalizeError(error)
    };
  }
}

export async function getLatestActiveWeeklyFocus(studentId) {
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
      weeklyFocus: mapWeeklyFocusForStudent(data?.[0] || null),
      error: null
    };
  } catch (error) {
    return {
      weeklyFocus: null,
      error: normalizeError(error)
    };
  }
}

export async function getStudentLearningOverview(studentId) {
  const [profileResult, weeklyFocusResult] = await Promise.all([
    getStudentLearningProfile(studentId),
    getLatestActiveWeeklyFocus(studentId)
  ]);

  return {
    profile: profileResult.profile,
    weeklyFocus: weeklyFocusResult.weeklyFocus,
    error: profileResult.error || weeklyFocusResult.error || null
  };
}
