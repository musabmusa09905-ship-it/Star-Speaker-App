export const heartOfEnglishLevels = [
  {
    code: "A1.1",
    label: "Onset",
    staffLabel: "A1.1 - Onset",
    order: 1,
    description:
      "The student is at the very beginning. Listening, reading, speaking, and writing are very limited. They need support with basic words, simple sentences, and first self-expression."
  },
  {
    code: "A1.2",
    label: "Foundation",
    staffLabel: "A1.2 - Foundation",
    order: 2,
    description:
      "The student can understand very short and simple texts and produce very basic sentences. They can start handling simple everyday language with support."
  },
  {
    code: "A2.1",
    label: "Medial",
    staffLabel: "A2.1 - Medial",
    order: 3,
    description:
      "The student can talk about familiar topics using short and basic language. They can speak about simple work, family, and daily-life topics."
  },
  {
    code: "A2.2",
    label: "Average",
    staffLabel: "A2.2 - Average",
    order: 4,
    description:
      "The student can exchange basic information directly and has basic control of everyday language structures. They can handle simple daily communication."
  },
  {
    code: "B1.1",
    label: "Accurate",
    staffLabel: "B1.1 - Accurate",
    order: 5,
    description:
      "The student can use English more clearly and understandably in different contexts. They can express opinions and use English for different purposes."
  },
  {
    code: "B1.2",
    label: "Decent",
    staffLabel: "B1.2 - Decent",
    order: 6,
    description:
      "The student can understand more specific texts and explain ideas related to familiar fields. They can communicate with more confidence and structure."
  },
  {
    code: "B2.1",
    label: "Prolific",
    staffLabel: "B2.1 - Prolific",
    order: 7,
    description:
      "The student can communicate with more detail, use language more effectively, and express themselves in different situations with stronger control."
  },
  {
    code: "B2.2",
    label: "Fluent",
    staffLabel: "B2.2 - Fluent",
    order: 8,
    description:
      "The student can produce language more fluently and accurately in many situations, including more complex communication."
  },
  {
    code: "C1.1",
    label: "Proficient",
    staffLabel: "C1.1 - Proficient",
    order: 9,
    description:
      "The student can understand complex texts and communicate ideas clearly with a high level of independence."
  },
  {
    code: "C1.2",
    label: "Comfortable",
    staffLabel: "C1.2 - Comfortable",
    order: 10,
    description:
      "The student can communicate independently in academic and professional settings, though they may still miss subtle meanings, idioms, or deeper nuance."
  },
  {
    code: "C2.1",
    label: "Native-like",
    staffLabel: "C2.1 - Native-like",
    order: 11,
    description:
      "The student can participate in long discussions about abstract topics and use implied, indirect, or advanced meanings effectively."
  },
  {
    code: "C2.2",
    label: "Master",
    staffLabel: "C2.2 - Master",
    order: 12,
    description:
      "The student can use English effectively at a very advanced level, including professional, academic, and literary language."
  }
];

function normalizeLevel(value) {
  return String(value || "").trim().toLowerCase();
}

export function getLevelByCode(value) {
  const normalized = normalizeLevel(value);
  return heartOfEnglishLevels.find((level) => level.code.toLowerCase() === normalized) || null;
}

export function getLevelByLabel(value) {
  const normalized = normalizeLevel(value);
  return heartOfEnglishLevels.find((level) => level.label.toLowerCase() === normalized) || null;
}

export function getHeartOfEnglishLevel(value) {
  return getLevelByCode(value) || getLevelByLabel(value);
}

export function formatLevelForStudent(value) {
  if (!value) {
    return "";
  }

  return getHeartOfEnglishLevel(value)?.label || String(value);
}

export function formatLevelForStaff(value) {
  if (!value) {
    return "";
  }

  return getHeartOfEnglishLevel(value)?.staffLabel || String(value);
}

export function getLevelDescriptionForStaff(value) {
  return getHeartOfEnglishLevel(value)?.description || "";
}
