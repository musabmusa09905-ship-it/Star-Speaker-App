import { requireSupabaseClient } from "./supabaseClient.js";
import { getTodayHabitStatus } from "./studentStreaks.js";

export const reminderPreferenceColumns = [
  "id",
  "student_id",
  "reminders_enabled",
  "morning_enabled",
  "midday_enabled",
  "evening_enabled",
  "night_enabled",
  "positive_reinforcement_enabled",
  "preferred_morning_time",
  "preferred_midday_time",
  "preferred_evening_time",
  "preferred_night_time",
  "email_reminders_enabled",
  "preferred_email_time",
  "email_timezone",
  "tone",
  "created_at",
  "updated_at"
].join(", ");

const defaultPreferenceValues = {
  reminders_enabled: true,
  morning_enabled: true,
  midday_enabled: true,
  evening_enabled: true,
  night_enabled: true,
  positive_reinforcement_enabled: true,
  preferred_morning_time: "09:00",
  preferred_midday_time: "12:00",
  preferred_evening_time: "18:00",
  preferred_night_time: "21:00",
  email_reminders_enabled: false,
  preferred_email_time: "18:00",
  email_timezone: "Europe/Istanbul",
  tone: "supportive"
};

const reminderMessages = {
  morning: "Today's practice is ready. Start early. Small English output wins become confidence.",
  midday: "Your English habit is waiting. Start with one focused task.",
  evening: "Protect your English habit today with one submitted task.",
  night: "One short task can still protect today's habit.",
  completed: "You showed up today. That is how English confidence is built.",
  noTask: "Your teacher has not assigned a practice task yet.",
  disabled: "Reminders are turned off. You can still practice whenever you are ready."
};

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load reminder preferences. Please try again.";
}

function cleanBoolean(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function getTimeSlot(baseDate = new Date()) {
  const hour = baseDate.getHours();

  if (hour >= 21) {
    return "night";
  }

  if (hour >= 18) {
    return "evening";
  }

  if (hour >= 12) {
    return "midday";
  }

  return "morning";
}

function isSlotEnabled(preferences, slot) {
  const field = `${slot}_enabled`;
  return preferences?.[field] !== false;
}

export function mapReminderPreferences(row) {
  const source = row || {};

  return {
    id: source.id || null,
    studentId: source.student_id || null,
    remindersEnabled: cleanBoolean(source.reminders_enabled),
    morningEnabled: cleanBoolean(source.morning_enabled),
    middayEnabled: cleanBoolean(source.midday_enabled),
    eveningEnabled: cleanBoolean(source.evening_enabled),
    nightEnabled: cleanBoolean(source.night_enabled),
    positiveReinforcementEnabled: cleanBoolean(source.positive_reinforcement_enabled),
    preferredMorningTime: cleanText(source.preferred_morning_time, "09:00"),
    preferredMiddayTime: cleanText(source.preferred_midday_time, "12:00"),
    preferredEveningTime: cleanText(source.preferred_evening_time, "18:00"),
    preferredNightTime: cleanText(source.preferred_night_time, "21:00"),
    emailRemindersEnabled: cleanBoolean(source.email_reminders_enabled, false),
    preferredEmailTime: cleanText(source.preferred_email_time, "18:00"),
    emailTimezone: cleanText(source.email_timezone, "Europe/Istanbul"),
    tone: cleanText(source.tone, "supportive"),
    createdAt: source.created_at || null,
    updatedAt: source.updated_at || null
  };
}

function buildPreferencePayload(studentId, values = {}) {
  return {
    student_id: studentId,
    reminders_enabled: cleanBoolean(values.reminders_enabled, defaultPreferenceValues.reminders_enabled),
    morning_enabled: cleanBoolean(values.morning_enabled, defaultPreferenceValues.morning_enabled),
    midday_enabled: cleanBoolean(values.midday_enabled, defaultPreferenceValues.midday_enabled),
    evening_enabled: cleanBoolean(values.evening_enabled, defaultPreferenceValues.evening_enabled),
    night_enabled: cleanBoolean(values.night_enabled, defaultPreferenceValues.night_enabled),
    positive_reinforcement_enabled: cleanBoolean(
      values.positive_reinforcement_enabled,
      defaultPreferenceValues.positive_reinforcement_enabled
    ),
    preferred_morning_time: cleanText(values.preferred_morning_time, defaultPreferenceValues.preferred_morning_time),
    preferred_midday_time: cleanText(values.preferred_midday_time, defaultPreferenceValues.preferred_midday_time),
    preferred_evening_time: cleanText(values.preferred_evening_time, defaultPreferenceValues.preferred_evening_time),
    preferred_night_time: cleanText(values.preferred_night_time, defaultPreferenceValues.preferred_night_time),
    email_reminders_enabled: cleanBoolean(
      values.email_reminders_enabled,
      defaultPreferenceValues.email_reminders_enabled
    ),
    preferred_email_time: cleanText(values.preferred_email_time, defaultPreferenceValues.preferred_email_time),
    email_timezone: cleanText(values.email_timezone, defaultPreferenceValues.email_timezone),
    tone: cleanText(values.tone, defaultPreferenceValues.tone)
  };
}

export function reminderPreferencesToForm(preferences) {
  return {
    reminders_enabled: preferences?.remindersEnabled ?? true,
    morning_enabled: preferences?.morningEnabled ?? true,
    midday_enabled: preferences?.middayEnabled ?? true,
    evening_enabled: preferences?.eveningEnabled ?? true,
    night_enabled: preferences?.nightEnabled ?? true,
    positive_reinforcement_enabled: preferences?.positiveReinforcementEnabled ?? true,
    preferred_morning_time: preferences?.preferredMorningTime || "09:00",
    preferred_midday_time: preferences?.preferredMiddayTime || "12:00",
    preferred_evening_time: preferences?.preferredEveningTime || "18:00",
    preferred_night_time: preferences?.preferredNightTime || "21:00",
    email_reminders_enabled: preferences?.emailRemindersEnabled ?? false,
    preferred_email_time: preferences?.preferredEmailTime || "18:00",
    email_timezone: preferences?.emailTimezone || "Europe/Istanbul"
  };
}

export async function getStudentReminderPreferences(studentId) {
  try {
    const client = requireSupabaseClient();
    const { data: existing, error: existingError } = await client
      .from("student_reminder_preferences")
      .select(reminderPreferenceColumns)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingError) {
      return {
        preferences: mapReminderPreferences(null),
        error: normalizeError(existingError)
      };
    }

    if (existing) {
      return {
        preferences: mapReminderPreferences(existing),
        error: null
      };
    }

    const { data: created, error: createError } = await client
      .from("student_reminder_preferences")
      .insert(buildPreferencePayload(studentId, defaultPreferenceValues))
      .select(reminderPreferenceColumns)
      .single();

    if (createError) {
      return {
        preferences: mapReminderPreferences(null),
        error: normalizeError(createError)
      };
    }

    return {
      preferences: mapReminderPreferences(created),
      error: null
    };
  } catch (error) {
    return {
      preferences: mapReminderPreferences(null),
      error: normalizeError(error)
    };
  }
}

export async function saveStudentReminderPreferences(studentId, values) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("student_reminder_preferences")
      .upsert(buildPreferencePayload(studentId, values), { onConflict: "student_id" })
      .select(reminderPreferenceColumns)
      .single();

    if (error) {
      return {
        preferences: null,
        error: normalizeError(error)
      };
    }

    return {
      preferences: mapReminderPreferences(data),
      error: null
    };
  } catch (error) {
    return {
      preferences: null,
      error: normalizeError(error)
    };
  }
}

export function getStudentReminderState({
  preferences,
  tasks = [],
  submissions = [],
  feedback = [],
  baseDate = new Date()
}) {
  const slot = getTimeSlot(baseDate);
  const habit = getTodayHabitStatus({ submissions, tasks, baseDate });
  const reviewedTaskIds = new Set((feedback || []).map((item) => item.assigned_task_id));
  const hasReviewedToday = habit.latestTask ? reviewedTaskIds.has(habit.latestTask.id) : false;
  const remindersEnabled = preferences?.remindersEnabled !== false;
  const slotEnabled = isSlotEnabled(
    {
      morning_enabled: preferences?.morningEnabled,
      midday_enabled: preferences?.middayEnabled,
      evening_enabled: preferences?.eveningEnabled,
      night_enabled: preferences?.nightEnabled
    },
    slot
  );

  if (!remindersEnabled) {
    return {
      type: "disabled",
      slot,
      title: "Practice reminders are off",
      message: reminderMessages.disabled,
      actionLabel: "View Practice",
      actionHref: "/practice",
      habit
    };
  }

  if (habit.isComplete) {
    return {
      type: hasReviewedToday ? "reviewed" : "submitted_today",
      slot,
      title: "Completed today",
      message: preferences?.positiveReinforcementEnabled === false
        ? "Your practice task is submitted for today."
        : reminderMessages.completed,
      actionLabel: hasReviewedToday ? "View Feedback" : "View Progress",
      actionHref: hasReviewedToday ? "/feedback" : "/progress",
      habit
    };
  }

  if (!habit.nextTask) {
    return {
      type: "no_active_task",
      slot,
      title: "No active practice task right now",
      message: reminderMessages.noTask,
      actionLabel: "View Practice",
      actionHref: "/practice",
      habit
    };
  }

  if (!slotEnabled) {
    return {
      type: "slot_disabled",
      slot,
      title: "Today's practice task is ready",
      message: `${habit.nextTask.title} is ready when you are.`,
      actionLabel: "Start Practice",
      actionHref: `/record?taskId=${encodeURIComponent(habit.nextTask.id)}`,
      habit
    };
  }

  return {
      type: "task_available",
      slot,
      title: "Today's practice reminder",
    message: reminderMessages[slot],
    actionLabel: "Start Practice",
    actionHref: `/record?taskId=${encodeURIComponent(habit.nextTask.id)}`,
    habit
  };
}
