function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstSentence(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  const sentence = text.match(/^[^.!?]+[.!?]/)?.[0] || text;

  return sentence.length > 150 ? `${sentence.slice(0, 147).trim()}...` : sentence;
}

function formatTaskType(value) {
  if (!value) {
    return "practice";
  }

  return String(value).replaceAll("_", " ").toLowerCase();
}

function getTimeWindow(task) {
  const minutes = Number(task?.estimated_minutes || 0);

  if (!minutes) {
    return "one short answer";
  }

  if (minutes <= 5) {
    return "about 30-60 seconds";
  }

  if (minutes <= 10) {
    return "about 60-90 seconds";
  }

  return `${minutes} minutes of focused practice`;
}

function hasExplicitTaskRequirement(task, checklist) {
  const text = [
    cleanText(task?.description || task?.prompt),
    cleanText(task?.instructions),
    ...checklist
  ].join(" ");

  return /\b\d+\s*(?:-|–|to)\s*\d+\s*(?:seconds?|secs?|minutes?|mins?)\b/i.test(text) ||
    /\b(?:must|required|checklist|at least|minimum)\b/i.test(text);
}

function getMinimumPractice(task, type, checklist) {
  const guidanceByType = {
    speaking: [
      "Record one honest 20-30 second answer.",
      "Answer only the first part if the full task feels too much.",
      "Focus on clarity, not perfection."
    ],
    pronunciation: [
      "Read the key sentence three times.",
      "Submit your clearest attempt.",
      "One careful attempt is enough to restart."
    ],
    shadowing: [
      "Shadow only the first short section.",
      "Repeat it twice and submit your best attempt.",
      "Do not wait for perfection."
    ],
    vocabulary_activation: [
      "Use two target words in simple sentences.",
      "Record a short answer using the words naturally.",
      "Keep the idea clear and understandable."
    ],
    photo_description: [
      "Describe only three things you can see.",
      "Then add one feeling or opinion.",
      "Speak simply before you try to speak perfectly."
    ],
    reflection: [
      "Say three honest sentences.",
      "One clear thought is enough to begin.",
      "You can add more after you start."
    ]
  };
  const steps = guidanceByType[task?.task_type] || guidanceByType[type?.replaceAll(" ", "_")] || [
    "Record one short honest attempt.",
    "Use one idea from the task.",
    "Submit something understandable."
  ];
  const hasExplicitRequirement = hasExplicitTaskRequirement(task, checklist);

  return {
    title: "Difficult day? Start smaller.",
    intro: "One honest attempt keeps you moving.",
    steps,
    note: hasExplicitRequirement
      ? "Use this to get moving, then aim for the full finish line your teacher set."
      : "You can still do the full task after you start."
  };
}

export function buildTaskClarity(task = {}) {
  const title = cleanText(task.title) || "Speaking practice";
  const type = formatTaskType(task.task_type || task.typeLabel);
  const focus = cleanText(task.focus);
  const level = cleanText(task.level);
  const description = cleanText(task.description || task.prompt);
  const instructions = cleanText(task.instructions);
  const checklist = Array.isArray(task.checklist) ? task.checklist.filter(cleanText) : [];
  const phrases = Array.isArray(task.guiding_phrases) ? task.guiding_phrases.filter(cleanText) : [];
  const missionSource = firstSentence(description) || firstSentence(instructions);
  const timeWindow = getTimeWindow(task);
  const mission = missionSource || `Record ${timeWindow} for this ${type} task.`;
  const finishLine = checklist.length
    ? checklist.slice(0, 3)
    : [
        `Submit one understandable ${type === "reflection" ? "answer" : "recording"}.`,
        "It does not need to be perfect.",
        focus ? `Keep your focus on ${focus}.` : "Speak clearly enough for your teacher to understand your idea."
      ];
  const supportItems = [
    instructions && { label: "Teacher tip", value: instructions },
    phrases.length > 0 && { label: "Useful phrases", value: phrases.slice(0, 5).join(" | ") },
    description && description !== missionSource && { label: "Full prompt", value: description }
  ].filter(Boolean);
  const minimumPractice = getMinimumPractice(task, type, checklist);
  const challengeByType = {
    speaking: "Add one reason or example after your main answer.",
    shadowing: "Repeat one sentence again and notice the rhythm.",
    photo_description: "Add one detail about what might happen next.",
    vocabulary_activation: "Use one target word naturally in your own sentence.",
    pronunciation: "Listen once and repeat the clearest version.",
    reflection: "Add one sentence about what you would do differently next time."
  };
  const challenge = challengeByType[task.task_type] || (focus ? `Try to include one clear example connected to ${focus}.` : "");

  return {
    title,
    type,
    focus,
    level,
    mission,
    timeWindow,
    finishLine,
    supportItems,
    minimumPractice,
    challenge
  };
}
