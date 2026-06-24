import { requireSupabaseClient } from "./supabaseClient.js";

export const toneOptions = [
  { value: "warm_calm", label: "Warm and calm" },
  { value: "playful_funny", label: "Playful and funny" },
  { value: "strict_kind", label: "Strict but kind" },
  { value: "energetic_coach", label: "Energetic coach" },
  { value: "gentle_encouragement", label: "Gentle encouragement" }
];

export const humorOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

export const reminderVoiceColumns = [
  "id",
  "teacher_id",
  "tone",
  "humor_level",
  "style_notes",
  "catchphrases",
  "forbidden_style",
  "signature_name",
  "is_active",
  "created_at",
  "updated_at"
].join(", ");

const defaultReminderVoice = {
  tone: "warm_calm",
  humor_level: "medium",
  style_notes: "",
  catchphrases: [],
  forbidden_style: "",
  signature_name: "Star Speaker",
  is_active: true
};

const toneLanguage = {
  warm_calm: {
    morningOpener: "A calm start is enough. One small step protects your rhythm.",
    taskContext: "Start with one short recording or one writing answer.",
    encouragement: "A small thing you do today can have a big impact tomorrow.",
    afternoonCheckIn: "Your speaking practice is still waiting for you today.",
    eveningDirect: "One last gentle nudge for today.",
    completed: "You showed up today. That is how quiet confidence is built.",
    defaultCatchphrase: "One small answer is enough."
  },
  playful_funny: {
    morningOpener: "Your task is awake and trying very hard to look important.",
    taskContext: "Start with one short recording or one writing answer.",
    encouragement: "Small daily wins are how your future self starts showing off.",
    afternoonCheckIn: "I can see your task is still untouched today.",
    eveningDirect: "One last gentle nudge for today.",
    completed: "Good. You showed up today, and the habit noticed.",
    defaultCatchphrase: "Touch the task before it starts missing you."
  },
  strict_kind: {
    morningOpener: "You do not need a perfect mood today. You need one small action.",
    taskContext: "Choose one short recording or one writing answer and complete it clearly.",
    encouragement: "Keep the standard simple: show up, finish one task, move on.",
    afternoonCheckIn: "You have not started yet, but there is still time.",
    eveningDirect: "This is the final window today.",
    completed: "You did the work. Keep that standard tomorrow.",
    defaultCatchphrase: "One small action. No drama."
  },
  energetic_coach: {
    morningOpener: "Let's go. One small answer keeps your rhythm alive.",
    taskContext: "Record one answer or finish one writing task and build momentum.",
    encouragement: "Start fast, keep it focused, and let the win carry you.",
    afternoonCheckIn: "Momentum is still available. Start with the first sentence.",
    eveningDirect: "Last push for today.",
    completed: "Great work. You kept the rhythm moving.",
    defaultCatchphrase: "One focused answer. Let's move."
  },
  gentle_encouragement: {
    morningOpener: "Begin softly. One small answer is enough today.",
    taskContext: "A short recording or one writing answer is a good return point.",
    encouragement: "No pressure to be perfect. Just come back with one small step.",
    afternoonCheckIn: "Your practice is still here when you are ready.",
    eveningDirect: "If you still have a little energy, this is a gentle final nudge.",
    completed: "You came back to your English today. That matters.",
    defaultCatchphrase: "One small step is enough."
  }
};

const playfulLines = {
  low: [
    "One short answer. That is all I am asking.",
    "Your task is still waiting today."
  ],
  medium: [
    "I can see that task sitting there untouched.",
    "Touch the task before it starts missing you.",
    "Your task is looking at me like, 'Where is Ricmartin?'"
  ],
  high: [
    "What happened, Ricmartin? 👀",
    "Touch it before I bring the imaginary boxing gloves 🥊",
    "Your task is looking at me like, 'Where is Ricmartin?'",
    "One short answer. That is all I am asking."
  ]
};

const unsafePatterns = [
  /\bbeat\b/i,
  /\bhit\b/i,
  /\bpunch\b/i,
  /\bkill\b/i,
  /\bslap\b/i,
  /\bthreat/i,
  /\bpunish/i,
  /\bhumiliat/i,
  /\binsult/i,
  /\bstupid\b/i,
  /\bdumb\b/i,
  /\blazy\b/i,
  /\buseless\b/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\bdisappoint/i,
  /\bfear\b/i,
  /\bshame\b/i,
  /\banxiety\b/i,
  /\bdepress/i,
  /\btrauma\b/i,
  /\badhd\b/i,
  /\bautis/i
];

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function cleanTone(value) {
  return toneOptions.some((option) => option.value === value) ? value : defaultReminderVoice.tone;
}

function cleanHumorLevel(value) {
  return humorOptions.some((option) => option.value === value) ? value : defaultReminderVoice.humor_level;
}

function hasUnsafeLanguage(value) {
  return unsafePatterns.some((pattern) => pattern.test(value || ""));
}

export function softenRiskyText(value, tone = "playful_funny") {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (!hasUnsafeLanguage(text)) {
    return text;
  }

  if (tone === "strict_kind") {
    return "One small action is enough. Keep it respectful and steady.";
  }

  if (tone === "gentle_encouragement") {
    return "No pressure. Just return with one small step.";
  }

  if (tone === "energetic_coach") {
    return "Let's keep it strong and safe: one short answer, then done.";
  }

  if (/\blazy\b|\bdisappoint/i.test(text)) {
    return "I know you can still take one small step today.";
  }

  return "Do it before I bring the imaginary boxing gloves 🥊";
}

export function mapTeacherReminderVoice(row, profile = null) {
  const source = row || {};
  const fallbackSignature = profile?.full_name || defaultReminderVoice.signature_name;

  return {
    id: source.id || null,
    teacherId: source.teacher_id || source.teacherId || profile?.id || null,
    tone: cleanTone(source.tone),
    humorLevel: cleanHumorLevel(source.humor_level || source.humorLevel),
    styleNotes: cleanText(source.style_notes ?? source.styleNotes),
    catchphrases: Array.isArray(source.catchphrases)
      ? source.catchphrases.map((item) => cleanText(item)).filter(Boolean)
      : [],
    forbiddenStyle: cleanText(source.forbidden_style ?? source.forbiddenStyle),
    signatureName: cleanText(source.signature_name ?? source.signatureName, fallbackSignature),
    isActive: source.is_active !== undefined ? source.is_active !== false : source.isActive !== false,
    createdAt: source.created_at || source.createdAt || null,
    updatedAt: source.updated_at || source.updatedAt || null
  };
}

export function teacherReminderVoiceToForm(voice, profile = null) {
  const mapped = mapTeacherReminderVoice(voice, profile);

  return {
    tone: mapped.tone,
    humor_level: mapped.humorLevel,
    style_notes: mapped.styleNotes,
    catchphrases: mapped.catchphrases.join("\n"),
    forbidden_style: mapped.forbiddenStyle,
    signature_name: mapped.signatureName,
    is_active: mapped.isActive
  };
}

function buildTeacherReminderVoicePayload(userId, values = {}, profile = null) {
  const catchphrases = cleanText(values.catchphrases)
    .split(/\r?\n/)
    .map((item) => softenRiskyText(item, values.tone))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    teacher_id: userId,
    tone: cleanTone(values.tone),
    humor_level: cleanHumorLevel(values.humor_level),
    style_notes: cleanText(values.style_notes) || null,
    catchphrases,
    forbidden_style: cleanText(values.forbidden_style) || null,
    signature_name: cleanText(values.signature_name, profile?.full_name || defaultReminderVoice.signature_name),
    is_active: values.is_active !== false
  };
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.includes("teacher_reminder_voices")) {
    return "Teacher Reminder Voice is not ready yet. Run the reminder voice migration in Supabase.";
  }

  return "Could not save Teacher Reminder Voice. Please try again.";
}

export async function getTeacherReminderVoice(userId, profile = null) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("teacher_reminder_voices")
      .select(reminderVoiceColumns)
      .eq("teacher_id", userId)
      .maybeSingle();

    if (error) {
      return {
        voice: mapTeacherReminderVoice(null, profile),
        error: normalizeError(error)
      };
    }

    return {
      voice: mapTeacherReminderVoice(data, profile),
      error: null
    };
  } catch (error) {
    return {
      voice: mapTeacherReminderVoice(null, profile),
      error: normalizeError(error)
    };
  }
}

export async function saveTeacherReminderVoice(userId, values, profile = null) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("teacher_reminder_voices")
      .upsert(buildTeacherReminderVoicePayload(userId, values, profile), { onConflict: "teacher_id" })
      .select(reminderVoiceColumns)
      .single();

    if (error) {
      return {
        voice: null,
        error: normalizeError(error)
      };
    }

    return {
      voice: mapTeacherReminderVoice(data, profile),
      error: null
    };
  } catch (error) {
    return {
      voice: null,
      error: normalizeError(error)
    };
  }
}

function getToneLanguage(tone) {
  return toneLanguage[tone] || toneLanguage.warm_calm;
}

function getCatchphrase(teacherVoice, messageType = "morning_ready") {
  const phrases = teacherVoice?.catchphrases || [];
  const safePhrases = phrases.map((phrase) => softenRiskyText(phrase, teacherVoice?.tone)).filter(Boolean);
  const usablePhrases = safePhrases.filter((phrase) =>
    messageType === "whatsapp_missing" ? phrase.length <= 90 : phrase.length <= 130
  );
  const phraseByType = {
    morning_ready: 0,
    afternoon_missing: 1,
    evening_missing: 0,
    whatsapp_missing: 1,
    completed_encouragement: 2
  };

  if (usablePhrases.length > 0) {
    return usablePhrases[(phraseByType[messageType] || 0) % usablePhrases.length];
  }

  return "";
}

function getPlayfulLine(teacherVoice, messageType) {
  const tone = teacherVoice?.tone || "warm_calm";
  const humorLevel = teacherVoice?.humorLevel || "medium";
  const language = getToneLanguage(tone);

  if (tone !== "playful_funny") {
    if (tone === "strict_kind" && humorLevel === "high") {
      return "No drama today. One clear action is enough.";
    }

    if (tone === "energetic_coach") {
      return "Let's keep the rhythm alive.";
    }

    return language.encouragement;
  }

  const lines = playfulLines[humorLevel] || playfulLines.medium;

  if (messageType === "whatsapp_missing") {
    return lines[humorLevel === "high" ? 1 : 0] || lines[0];
  }

  if (messageType === "afternoon_missing") {
    return lines[humorLevel === "high" ? 0 : 1] || lines[0];
  }

  if (messageType === "evening_missing") {
    return lines[humorLevel === "high" ? 1 : 0] || lines[0];
  }

  return lines[0];
}

function getGreeting({ tone, humorLevel, messageType, name }) {
  if (messageType === "whatsapp_missing" && tone === "playful_funny") {
    return humorLevel === "high" ? `What happened, ${name} 👀` : `Hey ${name} 👀`;
  }

  if (messageType === "morning_ready") {
    return tone === "playful_funny" && humorLevel !== "low"
      ? `Good morning, ${name} 👀`
      : `Good morning, ${name} 🌱`;
  }

  if (messageType === "afternoon_missing") {
    if (tone === "playful_funny" && humorLevel !== "low") {
      return `What happened, ${name}? 👀`;
    }

    return `Hey ${name}`;
  }

  if (messageType === "evening_missing") {
    return tone === "strict_kind" ? name : `${name} ❤️`;
  }

  if (messageType === "completed_encouragement") {
    return tone === "gentle_encouragement" ? `${name}` : `${name} 🔥`;
  }

  return `Hey ${name}`;
}

function getStyleHint(teacherVoice, messageType) {
  const notes = cleanText(teacherVoice?.styleNotes).toLowerCase();

  if (!notes) {
    return "";
  }

  if (notes.includes("calm") && messageType !== "whatsapp_missing") {
    return "Keep it calm and simple.";
  }

  if ((notes.includes("cheerful") || notes.includes("playful")) && messageType !== "morning_ready") {
    return "Bring one cheerful little answer back to the app.";
  }

  if (notes.includes("flamboyant") && teacherVoice?.tone === "playful_funny") {
    return "Make it small, make it dramatic, then call it done.";
  }

  return "";
}

function withSignature(message, signature) {
  return `${message.trim()}\n\n— ${signature}`;
}

function getMotivationValue(profile, snakeName, camelName = snakeName) {
  return cleanText(profile?.[snakeName] ?? profile?.[camelName]);
}

function hasMotivationProfile(profile) {
  if (!profile) {
    return false;
  }

  return [
    "goal",
    "personal_trigger",
    "strength_note",
    "struggle_note",
    "preferred_push"
  ].some((key) => Boolean(getMotivationValue(profile, key)));
}

function getMotivationStyle(profile, teacherVoice) {
  const rawStyle = getMotivationValue(profile, "motivation_style", "motivationStyle");
  const avoidNote = getMotivationValue(profile, "avoid_note", "avoidNote").toLowerCase();

  if (avoidNote.includes("joke") || avoidNote.includes("funny") || avoidNote.includes("harsh") || avoidNote.includes("strict")) {
    return "soft_encouragement";
  }

  if ([
    "soft_encouragement",
    "funny_push",
    "strict_kind",
    "emotional_reminder",
    "challenge_mode"
  ].includes(rawStyle)) {
    return rawStyle;
  }

  if (teacherVoice?.tone === "playful_funny") {
    return "funny_push";
  }

  if (teacherVoice?.tone === "strict_kind") {
    return "strict_kind";
  }

  if (teacherVoice?.tone === "energetic_coach") {
    return "challenge_mode";
  }

  return "soft_encouragement";
}

function safeMotivationText(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (!hasUnsafeLanguage(text)) {
    return text;
  }

  if (/\blazy\b/i.test(text)) {
    return "needs a small push to start";
  }

  if (/\bfailed\b|\bfailure\b|\bdisappoint/i.test(text)) {
    return "needs help keeping the rhythm";
  }

  if (/\bbeat\b|\bhit\b|\bpunch\b|\bslap\b|\bkill\b/i.test(text)) {
    return "needs a playful but respectful push";
  }

  return "needs one safe, steady step";
}

function getGoalReason(goal) {
  const safeGoal = safeMotivationText(goal);
  const lowerGoal = safeGoal.toLowerCase();

  if (!safeGoal) {
    return "";
  }

  if (lowerGoal.includes("flight") || lowerGoal.includes("cabin") || lowerGoal.includes("attendant")) {
    return "This is interview practice, not just homework.";
  }

  if (lowerGoal.includes("ielts") || lowerGoal.includes("exam")) {
    return "IELTS rewards repetition, not perfect motivation.";
  }

  if (lowerGoal.includes("abroad") || lowerGoal.includes("italy")) {
    return "Future you abroad will need this confidence.";
  }

  if (lowerGoal.includes("confidence")) {
    return "Confidence is built by small daily proof.";
  }

  return `Your goal matters: ${safeGoal}.`;
}

function getGoalOpening({ goal, name, style }) {
  const safeGoal = safeMotivationText(goal);
  const lowerGoal = safeGoal.toLowerCase();

  if (lowerGoal.includes("flight") || lowerGoal.includes("cabin") || lowerGoal.includes("attendant")) {
    return `${name}, future cabin crew mode is waiting.`;
  }

  if (lowerGoal.includes("ielts") || lowerGoal.includes("exam")) {
    return `${name}, your exam rhythm is built one answer at a time.`;
  }

  if (lowerGoal.includes("abroad") || lowerGoal.includes("italy")) {
    return `${name}, one small English step today makes real life easier later.`;
  }

  if (style === "funny_push") {
    return `What happened, ${name}? Your task is still waiting.`;
  }

  if (style === "challenge_mode") {
    return `${name}, one short answer. That is the challenge today.`;
  }

  return `${name}, one small step is enough today.`;
}

function getStruggleLine(struggleNote) {
  const safeStruggle = safeMotivationText(struggleNote);
  const lower = safeStruggle.toLowerCase();

  if (!safeStruggle) {
    return "";
  }

  if (lower.includes("overthink")) {
    return "You do not need a perfect answer. You need one honest attempt.";
  }

  if (lower.includes("inconsisten") || lower.includes("rhythm")) {
    return "Today is one of those small days that protects your rhythm.";
  }

  if (lower.includes("nervous")) {
    return "You can start nervous. You just cannot stay silent.";
  }

  if (lower.includes("exam")) {
    return "Keep it small enough to start and focused enough to count.";
  }

  if (lower.includes("small push")) {
    return "Come back with one small action.";
  }

  return "One small action is enough to move through the hard part.";
}

function getStrengthLine(strengthNote) {
  const safeStrength = safeMotivationText(strengthNote);

  if (!safeStrength) {
    return "";
  }

  if (hasUnsafeLanguage(strengthNote)) {
    return "You have already shown that you can do this.";
  }

  return `Remember this strength: ${safeStrength}.`;
}

function getPushLine({ style, preferredPush }) {
  const safePush = safeMotivationText(preferredPush).toLowerCase();

  if (safePush.includes("playful")) {
    return "Touch the task before it starts missing you.";
  }

  if (safePush.includes("calm")) {
    return "Keep it calm: one honest answer is enough.";
  }

  if (safePush.includes("direct") || safePush.includes("discipline")) {
    return "You do not need motivation today. You need one small action.";
  }

  if (safePush.includes("future") || safePush.includes("emotional")) {
    return "This is proof that you are still building the person you want to become.";
  }

  if (safePush.includes("challenge")) {
    return "One short answer. That is the challenge today.";
  }

  if (style === "funny_push") {
    return "Your task is sitting there like it got abandoned. Bring it back with one short answer.";
  }

  if (style === "strict_kind") {
    return "You do not need motivation today. You need one small action.";
  }

  if (style === "emotional_reminder") {
    return "This is not only today's task. It is proof that you are still building the person you want to become.";
  }

  if (style === "challenge_mode") {
    return "One short answer. That is the challenge today.";
  }

  return "No pressure to be perfect. Just return with one small step.";
}

function buildPersonalizedReminder({
  teacherVoice,
  studentMotivationProfile,
  name,
  messageType,
  signature
}) {
  if (!hasMotivationProfile(studentMotivationProfile)) {
    return "";
  }

  const style = getMotivationStyle(studentMotivationProfile, teacherVoice);
  const goal = getMotivationValue(studentMotivationProfile, "goal");
  const strengthNote = getMotivationValue(studentMotivationProfile, "strength_note", "strengthNote");
  const struggleNote = getMotivationValue(studentMotivationProfile, "struggle_note", "struggleNote");
  const preferredPush = getMotivationValue(studentMotivationProfile, "preferred_push", "preferredPush");
  const goalOpening = getGoalOpening({ goal, name, style });
  const goalReason = getGoalReason(goal);
  const strengthLine = getStrengthLine(strengthNote);
  const struggleLine = getStruggleLine(struggleNote);
  const pushLine = getPushLine({ style, preferredPush });
  const isCompleted = messageType === "completed_encouragement";
  const bodyLines = [
    goalOpening,
    isCompleted ? "Good. You showed up today." : goalReason,
    isCompleted
      ? (strengthLine || "That task may look small, but this is exactly how confidence is built.")
      : (struggleLine || pushLine),
    isCompleted ? "Keep this rhythm tomorrow." : pushLine
  ].filter(Boolean);

  return withSignature(bodyLines.join("\n\n"), signature);
}

export function generateReminderPreview({
  teacherVoice,
  studentMotivationProfile = null,
  studentName = "Ricmartin",
  messageType = "morning_ready",
  taskStatus = ""
}) {
  const voice = mapTeacherReminderVoice(teacherVoice);
  const name = cleanText(studentName, "student");
  const signature = cleanText(voice.signatureName, "Star Speaker");
  const tone = voice.tone;
  const humorLevel = voice.humorLevel;
  const lines = getToneLanguage(tone);
  const greeting = getGreeting({ tone, humorLevel, messageType, name });
  const catchphrase = getCatchphrase(voice, messageType);
  const playfulLine = getPlayfulLine(voice, messageType);
  const styleHint = getStyleHint(voice, messageType);
  const smartPush = catchphrase || styleHint || lines.defaultCatchphrase;
  const personalizedMessage = buildPersonalizedReminder({
    teacherVoice: voice,
    studentMotivationProfile,
    name,
    messageType,
    taskStatus,
    signature
  });

  if (
    personalizedMessage &&
    ["whatsapp_missing", "afternoon_missing", "evening_missing", "completed_encouragement"].includes(messageType)
  ) {
    return personalizedMessage;
  }

  const messages = {
    morning_ready: withSignature(
      `${greeting}\n\n` +
      "Your Star Speaker tasks are ready for today.\n\n" +
      `${lines.taskContext}\n\n` +
      `${catchphrase && catchphrase.length <= 70 ? `${catchphrase}\n\n` : ""}` +
      `${lines.encouragement}`,
      signature
    ),
    afternoon_missing: withSignature(
      `${greeting}\n\n` +
      `${lines.afternoonCheckIn}\n\n` +
      "No pressure. You do not need a perfect answer. One honest attempt is enough.\n\n" +
      `${tone === "playful_funny" ? playfulLine : smartPush}`,
      signature
    ),
    evening_missing: withSignature(
      `${greeting}\n\n` +
      `${lines.eveningDirect}\n\n` +
      "You do not need a perfect answer.\n" +
      "One short recording or one writing answer is enough to protect your rhythm.\n\n" +
      `${tone === "playful_funny" && humorLevel !== "low" ? playfulLine : smartPush}`,
      signature
    ),
    whatsapp_missing: withSignature(
      `${greeting}\n` +
      "Your task is still waiting today.\n" +
      "One short answer is enough.\n\n" +
      `${tone === "playful_funny" ? playfulLine : smartPush}`,
      signature
    ),
    completed_encouragement: withSignature(
      `${greeting}\n\n` +
      `${tone === "strict_kind" ? "Good. You showed up today." : "Good. You showed up today."}\n\n` +
      `${lines.completed}\n` +
      "Keep this rhythm tomorrow.",
      signature
    )
  };

  return messages[messageType] || messages.morning_ready;
}

export function getReminderPreviewSet(teacherVoice, studentName = "Ricmartin") {
  return [
    {
      type: "morning_ready",
      title: "Morning task-ready email",
      message: generateReminderPreview({ teacherVoice, studentName, messageType: "morning_ready" })
    },
    {
      type: "afternoon_missing",
      title: "Afternoon gentle reminder",
      message: generateReminderPreview({ teacherVoice, studentName, messageType: "afternoon_missing" })
    },
    {
      type: "evening_missing",
      title: "Evening final nudge",
      message: generateReminderPreview({ teacherVoice, studentName, messageType: "evening_missing" })
    },
    {
      type: "whatsapp_missing",
      title: "WhatsApp reminder preview",
      message: generateReminderPreview({ teacherVoice, studentName, messageType: "whatsapp_missing" })
    },
    {
      type: "completed_encouragement",
      title: "Completed-task encouragement",
      message: generateReminderPreview({ teacherVoice, studentName, messageType: "completed_encouragement" })
    }
  ];
}
