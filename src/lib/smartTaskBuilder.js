import { requireSupabaseClient } from "./supabaseClient.js";
import {
  createAssignedTaskForTeacher,
  getAssignedStudentsForTeacher
} from "./teacherAssignments.js";
import { createWritingTask } from "./writingPractice.js";

export const smartTaskTypes = [
  "speaking",
  "shadowing",
  "photo_description",
  "vocabulary_activation",
  "pronunciation",
  "reflection",
  "writing"
];

const profileColumns = [
  "id",
  "full_name",
  "email",
  "status",
  "role"
].join(", ");

const studentProfileColumns = [
  "user_id",
  "level",
  "main_goal",
  "speaking_focus",
  "pronunciation_focus",
  "vocabulary_focus",
  "practice_target",
  "practice_duration_target",
  "preferred_practice_time",
  "notes"
].join(", ");

const assignedTaskColumns = [
  "id",
  "student_id",
  "title",
  "task_type",
  "focus",
  "due_date",
  "status",
  "created_at"
].join(", ");

const studentPlans = [
  {
    id: "seyma",
    aliases: ["seyma", "seyma efe"],
    age: 29,
    level: "B1+",
    goal: "Prepare for a SunExpress flight attendant interview with clear, calm, confident speaking",
    strengths: ["warm", "hardworking", "responds well to encouragement"],
    weaknesses: ["inconsistent discipline", "repeats the same phrases", "weak connectors", "limited phrasal verbs"],
    appFocus: "Daily read-aloud, speaking flow, connectors, calm professional speaking, and flight-attendant vocabulary",
    preferredTaskTypes: ["speaking", "pronunciation", "vocabulary_activation", "writing"],
    avoidList: ["random idioms", "overly academic wording", "generic speaking prompts"],
    answerLength: "45-60 seconds",
    taskPatterns: [
      "Usually two tasks per day.",
      "Task 1 is often a 150-word read-aloud about cabin communication.",
      "Task 2 is a realistic flight attendant interview or passenger-service answer."
    ],
    dayThemes: [
      {
        title: "Flight Attendant Communication",
        situation: "explaining why professional cabin communication matters",
        question: "Why do you want to become a flight attendant, and how would your communication style help passengers?",
        readAloudTopic: "flight attendant communication and first impressions"
      },
      {
        title: "Calming a Nervous Passenger",
        situation: "helping a nervous passenger feel safe before takeoff",
        question: "A passenger tells you they are nervous before takeoff. What would you say and do?",
        readAloudTopic: "staying calm with nervous passengers"
      },
      {
        title: "Seat Complaint Situation",
        situation: "helping a passenger who complains about their seat",
        question: "A passenger is upset because they do not like their seat. How would you handle the situation?",
        readAloudTopic: "handling a difficult passenger politely"
      },
      {
        title: "Delay Announcement",
        situation: "explaining a short delay with patience and confidence",
        question: "The flight is delayed and passengers are getting impatient. How would you explain the situation professionally?",
        readAloudTopic: "making a calm delay announcement"
      },
      {
        title: "Confused Passenger Support",
        situation: "helping a confused passenger find the right seat and understand the next step",
        question: "A passenger looks confused about their seat and luggage. How would you help them without making them feel embarrassed?",
        readAloudTopic: "supporting a confused passenger warmly"
      },
      {
        title: "Turbulence Reassurance",
        situation: "reassuring a passenger who is afraid during turbulence",
        question: "A passenger is afraid during turbulence. What would you say to make them feel calmer?",
        readAloudTopic: "explaining safety calmly during turbulence"
      },
      {
        title: "Cabin Crew Teamwork",
        situation: "working with another cabin crew member during a busy service moment",
        question: "During a busy service, your teammate needs help. How would you support the cabin crew and keep passengers calm?",
        readAloudTopic: "teamwork and professional service"
      }
    ],
    phraseBank: [
      "First of all,",
      "In this situation,",
      "I would try to...",
      "Another thing I would do is...",
      "I believe that...",
      "This would help the passenger feel...",
      "Thank you for your patience.",
      "I understand your concern.",
      "We are doing our best to keep everyone safe."
    ],
    checklistRules: [
      "Answer the exact situation.",
      "Use a calm professional voice.",
      "Use at least four guiding phrases.",
      "Do not rush.",
      "Submit today."
    ]
  },
  {
    id: "selim",
    aliases: ["selim"],
    age: 29,
    level: "B1+",
    goal: "Speak more naturally and confidently in daily life and work",
    strengths: ["strong flow", "hardworking", "completes homework", "mature", "can speak for a long time"],
    weaknesses: ["small grammar errors", "sometimes misuses phrases", "needs collocations", "needs natural daily and work phrases", "phrase accuracy"],
    appFocus: "Natural phrases, work English, collocations, grammar accuracy, keeping strong flow while improving precision",
    preferredTaskTypes: ["speaking", "vocabulary_activation", "writing"],
    avoidList: ["too many corrections at once", "random idioms without context"],
    answerLength: "60-90 seconds",
    dayThemes: [
      {
        title: "Work Challenge Update",
        situation: "explaining a challenge at work without sounding too formal",
        question: "Describe a recent work or life challenge and explain how you handled it."
      },
      {
        title: "Polite Follow-Up",
        situation: "following up on a task with a coworker",
        question: "How would you politely follow up when someone has not replied to an important message?"
      },
      {
        title: "Deadline Pressure",
        situation: "explaining pressure while staying clear and professional",
        question: "Talk about a time when you had a tight deadline. What did you do first?"
      },
      {
        title: "Natural Work Phrases",
        situation: "using daily work collocations in a short answer",
        question: "Explain your normal work routine using natural phrases and collocations."
      }
    ],
    phraseBank: [
      "The main challenge was...",
      "I had to deal with...",
      "I decided to follow up...",
      "It turned out that...",
      "The best solution was...",
      "Next time, I would..."
    ],
    checklistRules: [
      "Use at least three natural work phrases.",
      "Keep your flow natural.",
      "Check past tense and subject-verb agreement.",
      "Do not stop for every small mistake."
    ]
  },
  {
    id: "cemre",
    aliases: ["cemre"],
    age: 17,
    level: "B2",
    goal: "Prepare for life in Italy and daily English use",
    strengths: ["excellent flow", "strong vocabulary", "fast understanding", "energetic", "warm"],
    weaknesses: ["does not study consistently", "answers are too long", "needs connectors", "needs collocations", "needs phrasal verbs", "answer control"],
    appFocus: "Short controlled answers, Italy, life abroad, fashion, social life, concise speaking, upgraded expression",
    preferredTaskTypes: ["speaking", "vocabulary_activation", "reflection", "writing"],
    avoidList: ["basic boring tasks", "long academic prompts"],
    answerLength: "45-60 seconds",
    dayThemes: [
      {
        title: "Arriving in Italy",
        situation: "introducing herself in a new place",
        question: "Imagine you arrive in Italy and meet a new person. How would you introduce yourself naturally?"
      },
      {
        title: "Fashion and First Impressions",
        situation: "talking about style without overexplaining",
        question: "Describe an outfit or style you like and explain why it represents you."
      },
      {
        title: "Making Friends Abroad",
        situation: "starting a short social conversation",
        question: "How would you start a friendly conversation with someone your age in Italy?"
      },
      {
        title: "Solving a Small Problem Abroad",
        situation: "asking for help clearly and confidently",
        question: "You are lost in a new city. What would you say when asking someone for help?"
      }
    ],
    phraseBank: [
      "When I arrive in Italy,",
      "The main thing is...",
      "At the same time,",
      "For example,",
      "I would probably...",
      "To keep it simple,"
    ],
    checklistRules: [
      "Keep it 45-60 seconds.",
      "Use two connectors.",
      "Do not overexplain.",
      "Use one natural collocation.",
      "Stop when your answer is complete."
    ]
  },
  {
    id: "omer",
    aliases: ["omer"],
    age: 23,
    level: "B1+",
    goal: "Speak with better clarity, grammar control, confidence, and controlled flow",
    strengths: ["very hardworking", "studies seriously", "knows grammar on paper"],
    weaknesses: ["makes grammar mistakes while speaking", "repeats vocabulary", "misuses phrases", "forces smart words", "may go off topic", "may misunderstand questions"],
    appFocus: "Short structured answers, target grammar, question understanding, simple frameworks, phrase control",
    preferredTaskTypes: ["speaking", "vocabulary_activation", "reflection", "writing"],
    avoidList: ["advanced idioms", "fancy phrases", "long answers"],
    answerLength: "45-60 seconds",
    framework: "Answer -> Reason -> Example -> Closing",
    dayThemes: [
      {
        title: "Clear Opinion Answer",
        situation: "answering one opinion question with a simple structure",
        question: "Do you think daily practice is more important than long study sessions? Why?"
      },
      {
        title: "Past Simple Control",
        situation: "telling one past event without losing grammar control",
        question: "Describe one useful thing you did yesterday and why it was important."
      },
      {
        title: "Staying on Topic",
        situation: "answering only the question asked",
        question: "What is one habit you want to improve this month?"
      },
      {
        title: "Because So But Practice",
        situation: "using basic connectors accurately",
        question: "Talk about a difficult task and explain what you did because of the problem."
      }
    ],
    phraseBank: [
      "My answer is...",
      "The reason is...",
      "For example,",
      "Because of this,",
      "So I think...",
      "To finish,"
    ],
    checklistRules: [
      "Use Answer -> Reason -> Example -> Closing.",
      "Stay on topic.",
      "Do not use forced advanced phrases.",
      "Check because/so/but.",
      "Keep it 45-60 seconds."
    ]
  },
  {
    id: "ege",
    aliases: ["ege"],
    age: 21,
    level: "B1+",
    goal: "IELTS speaking and writing in about two weeks",
    strengths: ["strong English", "good understanding", "likely second strongest after Cemre"],
    weaknesses: ["weak consistency", "struggles with flow under pressure", "gets nervous in mock tests", "forgets frameworks"],
    appFocus: "IELTS paraphrasing, introductions, speaking framework, and pressure control",
    preferredTaskTypes: ["speaking", "vocabulary_activation", "writing"],
    avoidList: ["heavy new material", "too many new frameworks"],
    answerLength: "60 seconds",
    framework: "Answer -> Reason -> Example -> Closing",
    dayThemes: [
      {
        title: "IELTS Pressure Answer",
        situation: "answering once under light pressure",
        question: "Describe a person who helped you learn something important."
      },
      {
        title: "IELTS Paraphrasing Start",
        situation: "opening an answer with a paraphrased introduction",
        question: "Talk about a place where you can focus well."
      },
      {
        title: "IELTS Part 2 Framework",
        situation: "using a simple framework without memorizing",
        question: "Describe a useful skill you want to improve."
      },
      {
        title: "Calm One-Take Recording",
        situation: "training pressure control by recording once",
        question: "Describe a challenge you handled successfully."
      }
    ],
    phraseBank: [
      "I would paraphrase it as...",
      "The main reason is...",
      "A good example is...",
      "This made me realize that...",
      "Overall, I would say...",
      "I will record only once."
    ],
    checklistRules: [
      "Use Answer -> Reason -> Example -> Closing.",
      "Record only once.",
      "Do not add a new framework.",
      "Keep your opening clear.",
      "Finish with one closing sentence."
    ]
  },
  {
    id: "ogulcan",
    aliases: ["ogulcan"],
    age: 24,
    level: "A2",
    goal: "Long-term IELTS, but not ready yet",
    strengths: ["does assigned homework", "follows instructions"],
    weaknesses: ["low English level", "slow comprehension", "needs repetition", "did not study English much before", "brain does not operate in English yet"],
    appFocus: "English-thinking habit, simple sentences, basic comprehension, daily routine, basic vocabulary",
    preferredTaskTypes: ["vocabulary_activation", "speaking", "photo_description", "reflection", "writing"],
    avoidList: ["IELTS-style tasks", "advanced vocabulary", "long answers"],
    answerLength: "30-45 seconds",
    dayThemes: [
      {
        title: "My Daily Routine",
        situation: "thinking in simple English about routine",
        question: "What do you usually do in the morning?"
      },
      {
        title: "My Room",
        situation: "describing objects around him",
        question: "Describe three things in your room and where they are."
      },
      {
        title: "Food and Simple Opinions",
        situation: "using basic opinion sentences",
        question: "What food do you like, and why?"
      },
      {
        title: "Simple Day Description",
        situation: "building basic sentence flow",
        question: "What did you do today? Say four simple sentences."
      }
    ],
    phraseBank: [
      "I usually...",
      "There is...",
      "There are...",
      "I like it because...",
      "Today I...",
      "It is easy for me to..."
    ],
    checklistRules: [
      "Use short simple sentences.",
      "Speak for 30-45 seconds.",
      "Do not use IELTS phrases.",
      "Use words you really know.",
      "Say the answer slowly."
    ]
  },
  {
    id: "doga",
    aliases: ["doga"],
    age: 17,
    level: "A2+",
    goal: "IELTS in about two weeks; raise speaking and improve writing from around 4.5 toward 5.5",
    strengths: ["understands explanations"],
    weaknesses: ["low motivation", "laziness", "tired from taking IELTS multiple times", "weak writing"],
    appFocus: "70% writing, 20% speaking, 10% reading and vocabulary",
    preferredTaskTypes: ["writing", "vocabulary_activation", "speaking", "reflection"],
    avoidList: ["heavy full essays", "vague writing prompts", "punishing workload"],
    answerLength: "45-60 seconds",
    dayThemes: [
      {
        title: "Opinion Sentence Builder",
        situation: "building clear opinion sentences",
        question: "Give your opinion about studying at home and explain one reason."
      },
      {
        title: "IELTS Introduction Micro-Practice",
        situation: "paraphrasing a topic and writing a simple thesis",
        question: "Paraphrase this topic and say your opinion: Some people prefer online learning."
      },
      {
        title: "Topic Sentence Practice",
        situation: "making one clear body paragraph idea",
        question: "Create one topic sentence about why exercise is important."
      },
      {
        title: "Light Speaking Review",
        situation: "speaking lightly about a writing idea",
        question: "Explain one reason why young people need good habits."
      }
    ],
    phraseBank: [
      "Some people think that...",
      "I partly agree because...",
      "One clear reason is...",
      "This means that...",
      "For example,",
      "In short,"
    ],
    checklistRules: [
      "Keep it manageable.",
      "Write or say one clear idea.",
      "Do not write a full essay.",
      "Use one example.",
      "Stop after the target is complete."
    ]
  }
];

const fallbackPlan = {
  id: "general",
  aliases: [],
  age: null,
  level: "",
  goal: "clearer and more confident English communication",
  strengths: [],
  weaknesses: [],
  appFocus: "speaking clarity, vocabulary activation, and consistent practice",
  preferredTaskTypes: ["speaking", "vocabulary_activation", "reflection"],
  avoidList: ["generic unsupported tasks"],
  answerLength: "45-60 seconds",
  dayThemes: [
    {
      title: "Focused Speaking Practice",
      situation: "answering a practical everyday question",
      question: "Describe one real situation from your week and explain what you learned from it."
    },
    {
      title: "Clear Example Practice",
      situation: "using one specific example",
      question: "Talk about something useful you did recently and give one clear example."
    },
    {
      title: "Confidence Reflection",
      situation: "reflecting on progress",
      question: "What part of speaking English feels easier now, and what still needs practice?"
    }
  ],
  phraseBank: [
    "The main point is...",
    "For example,",
    "Another detail is...",
    "This helped me because...",
    "Next time, I will..."
  ],
  checklistRules: [
    "Answer the exact question.",
    "Use one clear example.",
    "Speak in complete sentences.",
    "Review once before submitting."
  ]
};

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not load Smart Task Builder data. Please try again.";
  }

  return message;
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeName(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c");
}

function firstName(student) {
  return cleanText(student?.full_name).split(/\s+/)[0] || "your student";
}

function formatTaskType(value) {
  return cleanText(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseNotes(notes) {
  const text = cleanText(notes);

  if (!text) {
    return [];
  }

  return text
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveStudentPlan(student) {
  const rawName = cleanText(student?.full_name || student?.email).toLowerCase();
  const normalized = normalizeName(rawName);
  const mojibakeSafeName = rawName
    .replace(/åž/g, "s")
    .replace(/åÿ/g, "s")
    .replace(/ã–/g, "o")
    .replace(/äÿ/g, "g");

  return studentPlans.find((plan) =>
    plan.aliases.some((alias) => normalized.includes(alias) || mojibakeSafeName.includes(alias))
  ) || fallbackPlan;
}

export function getSmartBuilderStudentProfile(student) {
  const plan = resolveStudentPlan(student);
  const learningProfile = student?.learningProfile || {};
  const isKnownStudent = plan.id !== fallbackPlan.id;

  return {
    age: isKnownStudent ? plan.age : null,
    level: isKnownStudent ? plan.level : cleanText(learningProfile.level) || plan.level,
    main_goal: isKnownStudent ? plan.goal : cleanText(learningProfile.main_goal) || plan.goal,
    speaking_focus: cleanText(learningProfile.speaking_focus) || (isKnownStudent ? plan.appFocus : ""),
    pronunciation_focus: cleanText(learningProfile.pronunciation_focus),
    vocabulary_focus: cleanText(learningProfile.vocabulary_focus),
    practice_target: cleanText(learningProfile.practice_target),
    strengths: isKnownStudent ? plan.strengths.join(", ") : "",
    weaknesses: isKnownStudent ? plan.weaknesses.join(", ") : "",
    app_focus: isKnownStudent ? plan.appFocus : "",
    preferred_tasks: isKnownStudent ? plan.preferredTaskTypes.map(formatTaskType).join(", ") : "",
    avoid_list: isKnownStudent ? plan.avoidList.join(", ") : "",
    notes: cleanText(learningProfile.notes)
  };
}

function getDayTheme(plan, dayNumber) {
  const themes = plan.dayThemes?.length ? plan.dayThemes : fallbackPlan.dayThemes;
  const index = Math.max(Number(dayNumber) || 1, 1) - 1;
  return themes[index % themes.length];
}

function includesAny(value, terms) {
  const text = normalizeName(value);
  return terms.some((term) => text.includes(normalizeName(term)));
}

function buildHistoryNote(taskHistory = []) {
  const recentTitles = taskHistory
    .slice(0, 3)
    .map((task) => cleanText(task.title))
    .filter(Boolean);

  if (!recentTitles.length) {
    return "";
  }

  return `This continues recent work on: ${recentTitles.join("; ")}.`;
}

function asLines(items) {
  return items.filter(Boolean).join("\n");
}

function appendTeacherNote(instructions, specialInstruction) {
  // Teacher special instructions guide draft generation internally.
  // They should never be pasted into the student-facing Instructions field.
  cleanText(specialInstruction);
  return instructions;
}

function buildContext({ student, values, index }) {
  const learningProfile = student?.learningProfile || {};
  const plan = resolveStudentPlan(student);
  const isKnownStudent = plan.id !== fallbackPlan.id;
  const dayNumber = Math.max(Number(values.dayNumber) || 1, 1) + index;
  const theme = getDayTheme(plan, dayNumber);
  const weeklyFocus = cleanText(values.weeklyFocus);
  const profileFocus = [
    cleanText(learningProfile.speaking_focus),
    cleanText(learningProfile.pronunciation_focus),
    cleanText(learningProfile.vocabulary_focus)
  ].filter(Boolean).join("; ");

  return {
    plan,
    theme,
    draftIndex: index,
    baseDayNumber: Math.max(Number(values.dayNumber) || 1, 1),
    dayNumber,
    studentName: firstName(student),
    level: isKnownStudent ? plan.level : cleanText(learningProfile.level) || plan.level || "",
    goal: isKnownStudent ? plan.goal : cleanText(learningProfile.main_goal) || plan.goal,
    focus: weeklyFocus || profileFocus || plan.appFocus || theme.title,
    minutes: Number(values.estimatedMinutes) > 0 ? Math.round(Number(values.estimatedMinutes)) : 10,
    dueDate: values.dueDate || "",
    specialInstruction: cleanText(values.specialInstruction),
    notes: parseNotes(learningProfile.notes),
    taskHistory: Array.isArray(student?.taskHistory) ? student.taskHistory : [],
    historyNote: buildHistoryNote(student?.taskHistory)
  };
}

function shouldUseSeymaConfusedPassengerPair(context, values) {
  if (context.plan.id !== "seyma" || values.taskType !== "speaking") {
    return false;
  }

  const baseDay = Number(values.dayNumber) || 1;
  const requestedTasks = Number(values.numberOfTasks) || 1;
  const focusText = [
    values.weeklyFocus,
    values.specialInstruction,
    context.focus,
    context.goal
  ].join(" ");

  return baseDay >= 4 && requestedTasks >= 2 && includesAny(focusText, [
    "flight attendant",
    "interview",
    "passenger",
    "speaking flow"
  ]);
}

function createSeymaConfusedPassengerReadAloudDraft(context) {
  return {
    title: "Read Aloud — Helping a Confused Passenger",
    description: [
      "Read the text aloud and record your voice.",
      "A flight attendant should be ready to help passengers who feel confused during a flight. Sometimes a passenger may not understand the seat number, the boarding process, the safety rules, or the cabin announcements. In these moments, the flight attendant should stay calm and speak clearly. She should not make the passenger feel embarrassed. Instead, she should explain the situation in a simple and polite way. A warm voice, good eye contact, and patient communication can make the passenger feel more comfortable. I believe that professional cabin crew members should be helpful, respectful, and solution-focused. When a passenger feels confused, the most important thing is to make them feel safe, respected, and supported."
    ].join("\n\n"),
    instructions: "Read the text aloud slowly, clearly, and warmly. Focus on calm pronunciation, smooth flow, and professional flight attendant communication. Record your voice one time and submit it.",
    task_type: "speaking",
    estimated_minutes: "3",
    level: "B1+",
    focus: "Calm pronunciation, smooth flow, passenger support, flight attendant communication",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "feel confused",
      "stay calm",
      "speak clearly",
      "explain the situation",
      "in a simple and polite way",
      "a warm voice",
      "patient communication",
      "feel safe, respected, and supported"
    ]),
    checklist: asLines([
      "Read the full text aloud",
      "Speak slowly and clearly",
      "Use a calm and warm voice",
      "Do not rush",
      "Focus on professional communication",
      "Record your voice one time",
      "Submit your recording today"
    ])
  };
}

function createSeymaConfusedPassengerSpeakingDraft(context) {
  return {
    title: "Speaking Answer — Helping a Confused Passenger",
    description: [
      "Answer this question in English:",
      "What would you do if a passenger felt confused and did not understand the safety instructions?",
      "Your answer should sound calm, helpful, and professional. Imagine that you are answering this question in a real flight attendant interview."
    ].join("\n\n"),
    instructions: "Record a 45–60 second answer. Use at least 4 guiding phrases. Explain what you would do first, how you would speak to the passenger, and how you would make the passenger feel safe.",
    task_type: "speaking",
    estimated_minutes: "5",
    level: "B1+",
    focus: "Interview speaking, connectors, calm communication, passenger support",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "First of all,",
      "In this situation,",
      "I would stay calm and…",
      "I would explain…",
      "Another thing I would do is…",
      "I believe that…",
      "This would help the passenger feel…",
      "For this reason,"
    ]),
    checklist: asLines([
      "Answer the exact question",
      "Speak for 45–60 seconds",
      "Use at least 4 guiding phrases",
      "Explain what you would do first",
      "Use a calm and professional voice",
      "Do not repeat the same phrase too much",
      "Submit your recording today"
    ])
  };
}

function createSeymaReadAloudDraft(context, values) {
  const passage = [
    `A calm cabin crew member can make a difficult flight feel safer for every passenger. During ${context.theme.readAloudTopic}, the most important thing is to speak clearly, warmly, and professionally.`,
    "First of all, the passenger needs to understand that the crew is aware of the situation. A simple sentence such as, Thank you for your patience, can reduce stress.",
    "In this situation, I would try to explain the next step without sounding nervous. Another thing I would do is use a steady voice and friendly eye contact.",
    "I believe that passengers feel more comfortable when the crew gives short, honest information. This would help the passenger feel respected, safe, and supported during the flight."
  ].join(" ");

  return {
    title: `${context.theme.title} Read-Aloud for Cabin Confidence`,
    description: `Read this passage aloud one time:\n\n${passage}`,
    instructions: appendTeacherNote(
      "Read slowly, clearly, and warmly one time. Focus on smooth flow, calm pronunciation, and professional flight attendant communication. Do not rush or restart many times.",
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: "Calm pronunciation, smooth flow, and flight attendant communication",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "calm cabin crew member",
      "speak clearly, warmly, and professionally",
      "Thank you for your patience.",
      "In this situation, I would try to...",
      "steady voice",
      "friendly eye contact",
      "short, honest information",
      "safe and supported"
    ]),
    checklist: asLines([
      "Read the full text.",
      "Speak slowly and clearly.",
      "Use a calm warm voice.",
      "Do not rush.",
      "Record once.",
      "Submit today."
    ])
  };
}

function createSeymaSpeakingDraft(context, values) {
  return {
    title: `${context.theme.title}: Professional Passenger Response`,
    description: [
      `${context.theme.question}\n\nSituation: ${context.theme.situation}.`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      "Record a 45-60 second answer. Use a calm professional voice and include at least four guiding phrases. Keep your answer realistic for a flight attendant interview or cabin service situation.",
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: "Speaking flow, connectors, and calm professional cabin communication",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "First of all,",
      "In this situation,",
      "I would try to...",
      "Another thing I would do is...",
      "I believe that...",
      "This would help the passenger feel...",
      "Thank you for your patience.",
      "I understand your concern."
    ]),
    checklist: asLines([
      "Answer the exact question.",
      "Speak for 45-60 seconds.",
      "Use at least four guiding phrases.",
      "Use a calm professional voice.",
      "Do not use random idioms.",
      "Submit today."
    ])
  };
}

function createSelimPairedDraft(context) {
  if (context.draftIndex % 2 === 0) {
    return {
      title: "Speaking — Explaining a Decision at Work",
      description: "Answer this question in English:\n\nTell me about a decision you made at work or in daily life. What was the situation, what options did you have, and why did you choose that solution?",
      instructions: "Record a 60–90 second answer. Keep your natural flow, but use clear work English and accurate phrases. Explain the situation, the decision, and what you learned from it.",
      task_type: "speaking",
      estimated_minutes: String(context.minutes),
      level: "B1+",
      focus: "Work English, collocations, natural flow, phrase accuracy",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "I had to make a decision about...",
        "I ran into a problem when...",
        "I had to deal with pressure because...",
        "The solution I found was...",
        "I figured out that...",
        "This helped me make progress because...",
        "I learned from this experience that..."
      ]),
      checklist: asLines([
        "Speak for 60–90 seconds",
        "Use at least 4 work phrases",
        "Explain the situation clearly",
        "Connect it to real life or work",
        "Keep your strong flow",
        "Check small grammar errors",
        "Submit today"
      ])
    };
  }

  return {
    title: "Vocabulary Activation — Work Collocations in Real Sentences",
    description: "Create 6 short spoken sentences using natural work phrases. Each sentence should connect to your real work, projects, decisions, or daily responsibilities.",
    instructions: "Record the 6 sentences clearly. After the sentences, add one short summary about which phrase feels most useful for your real life.",
    task_type: "vocabulary_activation",
    estimated_minutes: "5",
    level: "B1+",
    focus: "Natural work phrases, collocations, and phrase accuracy",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "run into a problem",
      "deal with pressure",
      "find a solution",
      "make progress",
      "figure something out",
      "learn from experience",
      "work on a project"
    ]),
    checklist: asLines([
      "Make 6 short spoken sentences",
      "Use real work or daily life examples",
      "Use each phrase naturally",
      "Do not use random idioms",
      "Check phrase accuracy",
      "Submit today"
    ])
  };
}

function createCemrePairedDraft(context) {
  if (context.draftIndex % 2 === 0) {
    return {
      title: "Speaking — First Conversation in Italy",
      description: "Answer this question in English:\n\nImagine you are in Italy and you meet someone new for the first time. How would you introduce yourself and keep the conversation natural?",
      instructions: "Record a 45–60 second answer. Keep it short, confident, and natural. Use connectors, but do not overexplain.",
      task_type: "speaking",
      estimated_minutes: String(context.minutes),
      level: "B2",
      focus: "Italy life abroad, concise answers, social confidence, connectors",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "When I arrive in Italy,",
        "I would like to...",
        "At first, I might feel...",
        "At the same time,",
        "I want to be open-minded because...",
        "This would help me settle into a new place."
      ]),
      checklist: asLines([
        "Speak for 45–60 seconds",
        "Use at least 2 connectors",
        "Do not overexplain",
        "Do not speak for too long",
        "Use one upgraded phrase",
        "Submit today"
      ])
    };
  }

  return {
    title: "Vocabulary Activation — Stylish Life Abroad Sentences",
    description: "Create 6 short stylish sentences about life abroad, fashion, social confidence, and independence. Keep the sentences natural and not too long.",
    instructions: "Record your 6 sentences clearly. Make each sentence sound like something you could really say when talking about moving to Italy.",
    task_type: "vocabulary_activation",
    estimated_minutes: "5",
    level: "B2",
    focus: "Life abroad vocabulary, collocations, phrasal verbs, concise expression",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "settle into a new place",
      "step out of my comfort zone",
      "make new friends",
      "build a routine",
      "get used to a new lifestyle",
      "feel more independent",
      "be open-minded"
    ]),
    checklist: asLines([
      "Make 6 short sentences",
      "Do not overexplain",
      "Use natural life-abroad examples",
      "Use at least one phrasal verb",
      "Keep your answer controlled",
      "Submit today"
    ])
  };
}

function createOmerPairedDraft(context) {
  if (context.draftIndex % 2 === 0) {
    return {
      title: "Speaking — Giving Advice with Should",
      description: "Answer this question in English:\n\nWhat advice would you give to someone who wants to improve their English speaking but does not practice every day?",
      instructions: "Record a 45–60 second answer. Use this simple framework: Answer → Reason → Example → Closing. Keep your sentences short and clear.",
      task_type: "speaking",
      estimated_minutes: String(context.minutes),
      level: "B1+",
      focus: "Clarity, grammar control, staying on topic, should/have to",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "My advice is...",
        "They should...",
        "The reason is...",
        "For example,",
        "They have to...",
        "This can help because...",
        "To finish,"
      ]),
      checklist: asLines([
        "Answer the exact question",
        "Use Answer → Reason → Example → Closing",
        "Stay on topic",
        "Keep sentences short",
        "Do not use forced advanced phrases",
        "Submit today"
      ])
    };
  }

  return {
    title: "Grammar Speaking — Short Advice Sentences",
    description: "Create short spoken sentences using should, have to, can, and because. Keep the language useful and simple.",
    instructions: "Record 6 controlled sentences. Do not try to sound fancy. Focus on accurate grammar and clear meaning.",
    task_type: "speaking",
    estimated_minutes: "5",
    level: "B1+",
    focus: "Grammar control, short sentences, should/have to/can, because",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "You should...",
      "You should not...",
      "You have to...",
      "You can...",
      "This is important because...",
      "For example,"
    ]),
    checklist: asLines([
      "Make 6 short sentences",
      "Use simple grammar",
      "Stay on topic",
      "Do not use forced advanced phrases",
      "Check because/so/but",
      "Submit today"
    ])
  };
}

function createEgePairedDraft(context, values) {
  const vocabularyFirst = values.taskType === "vocabulary_activation";

  if ((context.draftIndex % 2 === 0) === vocabularyFirst) {
    return {
      title: "Vocabulary Activation - IELTS Paraphrasing Starters",
      description: [
        "Practice IELTS-safe paraphrasing with real sentence prompts.",
        "1. Technology has made communication easier.",
        "2. Many students use online resources to improve their education.",
        "3. Children spend too much time using electronic devices.",
        "Create one clear alternative for each sentence. Keep the meaning the same."
      ].join("\n\n"),
      instructions: "Record or write 3 paraphrased sentences. Keep the meaning the same, use simple IELTS-safe wording, and avoid adding too many new ideas.",
      task_type: "vocabulary_activation",
      estimated_minutes: "6",
      level: "B1+",
      focus: "IELTS paraphrasing, introductions, safe wording, pressure control",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "Some people believe that...",
        "This means that...",
        "A good way to say this is...",
        "In other words,",
        "The main idea is...",
        "I partly agree because..."
      ]),
      checklist: asLines([
        "Create 6 paraphrased sentences",
        "Keep the same meaning",
        "Use IELTS-safe phrases",
        "Do not add heavy new material",
        "Check grammar",
        "Submit today"
      ])
    };
  }

  return {
    title: "Speaking — IELTS Pressure Control Answer",
    description: "Answer this IELTS-style question:\n\nDescribe a time when you had to study or work under pressure. What happened, what did you do, and what did you learn?",
    instructions: "Record a 60–90 second answer only one time. Use Answer → Reason → Example → Closing. The goal is pressure control, not perfection.",
    task_type: "speaking",
    estimated_minutes: String(context.minutes),
    level: "B1+",
    focus: "IELTS speaking framework, flow under pressure, one-take recording",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "I would describe...",
      "The main reason was...",
      "For example,",
      "This made me realize that...",
      "Overall, I would say...",
      "I will record only one time."
    ]),
    checklist: asLines([
      "Speak for 60–90 seconds",
      "Use Answer → Reason → Example → Closing",
      "Record only one time",
      "Do not add a new framework",
      "Stay calm under pressure",
      "Submit today"
    ])
  };
}

function createOgulcanPairedDraft(context, values) {
  const vocabularyFirst = values.taskType !== "speaking";

  if ((context.draftIndex % 2 === 0) === vocabularyFirst) {
    return {
      title: "Vocabulary Activation — Three Objects Around Me",
      description: "Look around your room or table. Choose three simple objects and say short English sentences about them.",
      instructions: "Record simple sentences slowly. Use basic English. Do not worry about mistakes. The goal is to make your brain start in English.",
      task_type: "vocabulary_activation",
      estimated_minutes: "5",
      level: "A2",
      focus: "English thinking, basic vocabulary, objects, simple sentences",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "I can see...",
        "There is...",
        "There are...",
        "It is...",
        "I use it for...",
        "I need..."
      ]),
      checklist: asLines([
        "Use simple English",
        "Make short sentences",
        "Speak slowly",
        "Do not worry about mistakes",
        "Use words you know",
        "Submit today"
      ])
    };
  }

  return {
    title: "Speaking — My Simple Morning",
    description: "Answer this question in English:\n\nWhat do you usually do in the morning? Say simple sentences about your routine.",
    instructions: "Record a 30–45 second answer. Use short basic sentences. Speak slowly and clearly.",
    task_type: "speaking",
    estimated_minutes: String(context.minutes),
    level: "A2",
    focus: "Daily routine, simple sentences, English-thinking habit",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "I usually...",
      "First, I...",
      "Then I...",
      "After that,",
      "I like...",
      "Today I..."
    ]),
    checklist: asLines([
      "Speak for 30–45 seconds",
      "Use simple English",
      "Use short sentences",
      "Speak slowly",
      "Do not use IELTS phrases",
      "Submit today"
    ])
  };
}

function createDogaPairedDraft(context, values) {
  const vocabularyFirst = values.taskType === "vocabulary_activation";

  if ((context.draftIndex % 2 === 0) === vocabularyFirst) {
    return {
      title: "Vocabulary Activation — IELTS Micro-Writing Paraphrase",
      description: "Paraphrase this idea in simple IELTS-safe English:\n\nSome people think technology makes education better.\n\nThen add one short opinion sentence with a reason.",
      instructions: "Write or say a short micro-answer. Keep the meaning, use simple grammar, and do not write a full essay.",
      task_type: "vocabulary_activation",
      estimated_minutes: "6",
      level: "A2+",
      focus: "IELTS micro-writing, paraphrasing, opinion sentence, simple grammar",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "Some people believe that...",
        "Technology can help education because...",
        "I agree because...",
        "One reason is...",
        "For example,",
        "This means that..."
      ]),
      checklist: asLines([
        "Keep the meaning",
        "Use simple grammar",
        "Do not write too much",
        "Write one opinion sentence",
        "Check grammar",
        "Submit today"
      ])
    };
  }

  return {
    title: "Speaking — Simple Exam Preparation Answer",
    description: "Answer this question in English:\n\nWhat is one small thing you can do today to prepare better for IELTS?",
    instructions: "Record a short and simple answer. Keep it light, clear, and manageable.",
    task_type: "speaking",
    estimated_minutes: String(context.minutes),
    level: "A2+",
    focus: "Light speaking, exam preparation, simple ideas, motivation",
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "Today I can...",
      "This is useful because...",
      "One small step is...",
      "I do not need to...",
      "I will try to...",
      "In short,"
    ]),
    checklist: asLines([
      "Keep it short",
      "Use simple grammar",
      "Give one clear reason",
      "Do not make it too heavy",
      "Check grammar",
      "Submit today"
    ])
  };
}

function createKnownStudentPairedDraft(context, values) {
  const requestedTasks = Number(values.numberOfTasks) || 1;

  if (requestedTasks < 2 || !["speaking", "vocabulary_activation"].includes(values.taskType)) {
    return null;
  }

  if (context.plan.id === "selim") {
    return createSelimPairedDraft(context);
  }

  if (context.plan.id === "cemre") {
    return createCemrePairedDraft(context);
  }

  if (context.plan.id === "omer") {
    return createOmerPairedDraft(context);
  }

  if (context.plan.id === "ege") {
    return createEgePairedDraft(context, values);
  }

  if (context.plan.id === "ogulcan") {
    return createOgulcanPairedDraft(context, values);
  }

  if (context.plan.id === "doga") {
    return createDogaPairedDraft(context, values);
  }

  return null;
}

function createWritingTaskDraft({
  title,
  prompt,
  instructions,
  focus,
  level,
  minWords,
  dueDate
}) {
  return {
    draft_type: "writing",
    task_type: "writing",
    title,
    prompt,
    instructions,
    level,
    focus,
    due_date: dueDate,
    min_words: String(minWords || 80),
    description: "",
    estimated_minutes: "",
    guiding_phrases: "",
    checklist: ""
  };
}

function createSeymaWritingDraft(context) {
  return createWritingTaskDraft({
    title: "Flight Attendant Writing - Calm Passenger Response",
    prompt: "Write a short response to a passenger who is nervous during turbulence. Your response should sound calm, polite, and professional.",
    instructions: "Write 60-80 words. Use simple, warm, professional English. Include one sentence that makes the passenger feel safe. Do not write a long essay.",
    focus: "Polite writing, flight attendant communication, calm professional language",
    level: "B1+",
    minWords: 60,
    dueDate: context.dueDate
  });
}

function createSelimWritingDraft(context) {
  return createWritingTaskDraft({
    title: "Work English Writing - Problem and Solution",
    prompt: "Write a short paragraph about one problem you faced at work or in a project and how you solved it.",
    instructions: "Write 80-100 words. Use clear structure: problem, action, result. Try to use natural work phrases such as ran into a problem, found a solution, made progress, or learned from the experience.",
    focus: "Work English, clear explanation, collocations, grammar accuracy",
    level: "B1+",
    minWords: 80,
    dueDate: context.dueDate
  });
}

function createCemreWritingDraft(context) {
  return createWritingTaskDraft({
    title: "Life Abroad Writing - First Week in Italy",
    prompt: "Write a short paragraph about what you would do during your first week in Italy to feel more comfortable.",
    instructions: "Write 70-90 words. Keep it clear, natural, and not too long. Use at least two connectors, such as at first, also, because, however, or for this reason.",
    focus: "Life abroad writing, concise expression, connectors, natural style",
    level: "B2",
    minWords: 70,
    dueDate: context.dueDate
  });
}

function createOmerWritingDraft(context) {
  return createWritingTaskDraft({
    title: "Clear Writing - Answer, Reason, Example",
    prompt: "Answer this question in 4 clear sentences: Do you think learning English every day is important?",
    instructions: "Use this structure: Answer, Reason, Example, Closing. Keep your sentences short and clear. Do not use unnecessary advanced phrases.",
    focus: "Clear writing, grammar control, answer structure, topic control",
    level: "B1+",
    minWords: 50,
    dueDate: context.dueDate
  });
}

function createEgeWritingDraft(context) {
  const focusText = [context.focus, context.theme.title, context.theme.situation].join(" ");

  if (includesAny(focusText, ["introduction", "intro"])) {
    return createWritingTaskDraft({
      title: "IELTS Introduction - Online Learning",
      prompt: [
        "Write a two-sentence IELTS introduction for this question:",
        "Some people believe that online learning is more effective than classroom learning. To what extent do you agree or disagree?"
      ].join("\n\n"),
      instructions: "Write 2 sentences only: one paraphrase and one clear opinion. Keep the meaning clear. Do not use long or complicated sentences.",
      focus: "IELTS introductions, paraphrasing, clear opinion sentence",
      level: "B1+",
      minWords: 50,
      dueDate: context.dueDate
    });
  }

  return createWritingTaskDraft({
    title: "IELTS Paraphrasing - Education and Technology",
    prompt: [
      "Rewrite the IELTS essay questions below using different words and sentence structures. Do not change the meaning.",
      "1. Some people believe that technology has made communication easier.",
      "2. Many students use online resources to improve their education.",
      "3. Some people think that children spend too much time using electronic devices.",
      "Write one clear paraphrased sentence for each question."
    ].join("\n\n"),
    instructions: "Rewrite all 3 sentences. Keep the meaning the same. Change some vocabulary and sentence structure. Do not make the sentences too long or complicated. Focus on clear IELTS-style writing.",
    focus: "IELTS paraphrasing, sentence control, technology vocabulary, clear meaning",
    level: "B1+",
    minWords: 60,
    dueDate: context.dueDate
  });
}

function createOgulcanWritingDraft(context) {
  return createWritingTaskDraft({
    title: "Simple Writing - My Daily Life",
    prompt: "Write 6 simple sentences about your daily life.",
    instructions: "Use simple English. Keep every sentence short and clear. Do not translate long Turkish sentences. Use words you already know.",
    focus: "Simple sentence building, daily routine vocabulary, English thinking",
    level: "A2",
    minWords: 40,
    dueDate: context.dueDate
  });
}

function createDogaWritingDraft(context) {
  const focusText = [context.focus, context.theme.title, context.theme.situation].join(" ");
  const shouldUseOpinionPractice =
    includesAny(focusText, ["opinion", "topic sentence", "body paragraph"]) &&
    context.draftIndex >= 2;

  if (includesAny(focusText, ["paraphrase", "paraphrasing"]) && !shouldUseOpinionPractice) {
    return createWritingTaskDraft({
      title: "IELTS Writing - Simple Paraphrasing",
      prompt: [
        "Rewrite these IELTS-style sentences with different words. Do not change the meaning.",
        "1. Students should learn practical skills at school.",
        "2. Technology helps young people study more easily.",
        "3. Some people believe that daily practice is better than studying only before exams."
      ].join("\n\n"),
      instructions: "Write one paraphrased sentence for each item. Use simple grammar. Do not make the sentences longer than necessary.",
      focus: "IELTS paraphrasing, simple grammar, sentence control",
      level: "A2+",
      minWords: 60,
      dueDate: context.dueDate
    });
  }

  return createWritingTaskDraft({
    title: "IELTS Writing - Opinion Sentences",
    prompt: [
      "Write your opinion about these topics.",
      "1. Students should study English every day.",
      "2. Technology helps students learn better.",
      "3. Young people should learn practical life skills.",
      "For each topic, write one opinion sentence and one reason."
    ].join("\n\n"),
    instructions: "Write 3 short answers. Each answer should have one opinion sentence and one reason. Use simple grammar. Do not write long or complicated sentences.",
    focus: "Opinion sentences, reasons, IELTS Task 2 basics, grammar clarity",
    level: "A2+",
    minWords: 60,
    dueDate: context.dueDate
  });
}

function createGeneralWritingDraft(context) {
  return createWritingTaskDraft({
    title: `${context.theme.title}: Short Writing Practice`,
    prompt: `Write a short answer about this situation: ${context.theme.situation}. Answer this question clearly: ${context.theme.question}`,
    instructions: "Write one clear paragraph. Use simple structure: answer, reason, example, closing. Keep it practical and manageable.",
    focus: context.focus,
    level: context.level,
    minWords: 70,
    dueDate: context.dueDate
  });
}

function createWritingDraft(context) {
  if (context.plan.id === "seyma") {
    return createSeymaWritingDraft(context);
  }

  if (context.plan.id === "selim") {
    return createSelimWritingDraft(context);
  }

  if (context.plan.id === "cemre") {
    return createCemreWritingDraft(context);
  }

  if (context.plan.id === "omer") {
    return createOmerWritingDraft(context);
  }

  if (context.plan.id === "ege") {
    return createEgeWritingDraft(context);
  }

  if (context.plan.id === "ogulcan") {
    return createOgulcanWritingDraft(context);
  }

  if (context.plan.id === "doga") {
    return createDogaWritingDraft(context);
  }

  return createGeneralWritingDraft(context);
}

function createWritingFollowUpDraft(context) {
  if (context.plan.id === "seyma") {
    return createSeymaConfusedPassengerSpeakingDraft(context);
  }

  if (context.plan.id === "selim") {
    return {
      ...createSelimPairedDraft({ ...context, draftIndex: 0 }),
      title: "Speaking - Explain the Same Work Problem"
    };
  }

  if (context.plan.id === "cemre") {
    return {
      ...createCemrePairedDraft({ ...context, draftIndex: 0 }),
      title: "Speaking - First Week in Italy"
    };
  }

  if (context.plan.id === "omer") {
    return createOmerPairedDraft({ ...context, draftIndex: 0 });
  }

  if (context.plan.id === "ege") {
    return {
      title: "Speaking - IELTS Pressure Control Answer",
      description: "Answer this IELTS-style question:\n\nDescribe a time when you had to study or work under pressure. What happened, what did you do, and what did you learn?",
      instructions: "Record a 60-90 second answer only one time. Use Answer -> Reason -> Example -> Closing. The goal is pressure control, not perfection.",
      task_type: "speaking",
      estimated_minutes: String(context.minutes),
      level: "B1+",
      focus: "IELTS speaking framework, flow under pressure, one-take recording",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "I would describe...",
        "The main reason was...",
        "For example,",
        "This made me realize that...",
        "Overall, I would say...",
        "I will record only one time."
      ]),
      checklist: asLines([
        "Speak for 60-90 seconds",
        "Use Answer -> Reason -> Example -> Closing",
        "Record only one time",
        "Do not add a new framework",
        "Stay calm under pressure",
        "Submit today"
      ])
    };
  }

  if (context.plan.id === "ogulcan") {
    return createOgulcanPairedDraft({ ...context, draftIndex: 0 }, { taskType: "speaking" });
  }

  if (context.plan.id === "doga") {
    return {
      title: "Speaking - Light IELTS Idea Practice",
      description: "Answer this question in English:\n\nWhat is one reason why students should practice English every day?",
      instructions: "Record a short 45-60 second answer. Use simple grammar. Give one reason and one example. Keep it light and clear.",
      task_type: "speaking",
      estimated_minutes: String(context.minutes),
      level: "A2+",
      focus: "Light IELTS speaking, simple reasons, confidence, manageable practice",
      due_date: context.dueDate,
      guiding_phrases: asLines([
        "I think students should...",
        "One reason is...",
        "For example,",
        "This can help because...",
        "In short,"
      ]),
      checklist: asLines([
        "Speak for 45-60 seconds",
        "Use simple grammar",
        "Give one reason",
        "Give one example",
        "Do not make it too heavy",
        "Submit today"
      ])
    };
  }

  return {
    ...createSpeakingDraft(context, { taskType: "speaking" }),
    task_type: "speaking"
  };
}

function createWritingOrMixedDraft(context, values) {
  if (values.taskType !== "writing") {
    return null;
  }

  if (context.draftIndex % 2 === 0) {
    return createWritingDraft(context);
  }

  return createWritingFollowUpDraft(context);
}

function createSpeakingDraft(context, values) {
  if (context.plan.id === "seyma") {
    if (shouldUseSeymaConfusedPassengerPair(context, values)) {
      const baseDay = Number(values.dayNumber) || 1;
      const draftIndex = context.dayNumber - baseDay;
      return draftIndex === 0
        ? createSeymaConfusedPassengerReadAloudDraft(context)
        : createSeymaConfusedPassengerSpeakingDraft(context);
    }

    const count = Number(values.numberOfTasks) || 1;
    return count > 1 && (context.dayNumber - Number(values.dayNumber || 1)) % 2 === 0
      ? createSeymaReadAloudDraft(context, values)
      : createSeymaSpeakingDraft(context, values);
  }

  return {
    title: `${context.theme.title}: Guided Speaking Answer`,
    description: [
      `${context.theme.question}\n\nContext: ${context.theme.situation}.`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      `Record a ${context.plan.answerLength || "45-60 second"} answer. Focus on ${context.focus}. ${context.plan.framework ? `Use this framework: ${context.plan.framework}.` : "Keep your answer organized and natural."}`,
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: context.focus,
    due_date: context.dueDate,
    guiding_phrases: asLines(context.plan.phraseBank || fallbackPlan.phraseBank),
    checklist: asLines(context.plan.checklistRules || fallbackPlan.checklistRules)
  };
}

function createShadowingDraft(context, values) {
  if (context.plan.id === "seyma") {
    return createSeymaReadAloudDraft(context, values);
  }

  const passage = [
    `${context.theme.title} is today's short read-aloud practice.`,
    `The goal is to speak about ${context.theme.situation} with control, clarity, and natural rhythm.`,
    `Read the sentences slowly first. Then record one smooth version. Focus on ${context.focus}.`,
    `Do not make the task longer than necessary. The best version is clear, steady, and easy to understand.`
  ].join(" ");

  return {
    title: `${context.theme.title} Read-Aloud Control`,
    description: [
      `Read this short passage aloud:\n\n${passage}`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      "Read slowly first, then record one clear version. Focus on rhythm, stress, and controlled pronunciation.",
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: context.focus,
    due_date: context.dueDate,
    guiding_phrases: asLines(context.plan.phraseBank?.slice(0, 6) || fallbackPlan.phraseBank),
    checklist: asLines([
      "Read the full text.",
      "Record one clear version.",
      "Do not rush.",
      "Check rhythm and pronunciation.",
      ...((context.plan.checklistRules || []).slice(0, 2))
    ])
  };
}

function createVocabularyDraft(context, values) {
  const phrases = context.plan.phraseBank || fallbackPlan.phraseBank;

  return {
    title: `${context.theme.title}: Phrase Activation`,
    description: [
      `Use today's phrase bank to speak about ${context.theme.situation}. Create short examples that match ${context.studentName}'s goal: ${context.goal}.`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      `Choose at least four phrases. Say each phrase in a complete sentence, then record a short ${context.plan.answerLength || "45-60 second"} answer using them naturally.`,
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: context.focus,
    due_date: context.dueDate,
    guiding_phrases: asLines(phrases),
    checklist: asLines([
      "Use at least four phrases.",
      "Say full sentences.",
      "Connect examples to the real situation.",
      ...((context.plan.checklistRules || fallbackPlan.checklistRules).slice(0, 3))
    ])
  };
}

function createPhotoDescriptionDraft(context, values) {
  return {
    title: `${context.theme.title}: Visual Situation Description`,
    description: [
      `Imagine a photo connected to this situation: ${context.theme.situation}. Describe who is there, what is happening, and what might happen next.`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      `Record a ${context.plan.answerLength || "45-60 second"} description. Stay concrete: people, place, actions, feelings, and one natural guess.`,
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: context.focus,
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "In the picture, I can see...",
      "It looks like...",
      "The person might be...",
      "In the background...",
      "This situation is connected to..."
    ]),
    checklist: asLines([
      "Mention people or objects.",
      "Mention the place.",
      "Mention actions.",
      "Make one natural guess.",
      ...((context.plan.checklistRules || fallbackPlan.checklistRules).slice(0, 2))
    ])
  };
}

function createPronunciationDraft(context, values) {
  if (context.plan.id === "seyma") {
    return {
      ...createSeymaReadAloudDraft(context, values),
      title: `${context.theme.title}: Calm Pronunciation Practice`,
      task_type: values.taskType,
      focus: "Calm pronunciation, sentence stress, and warm cabin voice"
    };
  }

  return {
    title: `${context.theme.title}: Clear Pronunciation Control`,
    description: [
      `Practice the phrases below slowly, then use them in a short answer about ${context.theme.situation}.`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      "Say each phrase slowly, then naturally. Record one short answer after the repetition. Focus on clear sentence stress and controlled speed.",
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: context.focus,
    due_date: context.dueDate,
    guiding_phrases: asLines((context.plan.phraseBank || fallbackPlan.phraseBank).slice(0, 6)),
    checklist: asLines([
      "Say each phrase slowly.",
      "Repeat naturally.",
      "Record one short answer.",
      "Avoid rushing.",
      ...((context.plan.checklistRules || fallbackPlan.checklistRules).slice(0, 2))
    ])
  };
}

function createReflectionDraft(context, values) {
  return {
    title: `${context.theme.title}: Focused Reflection`,
    description: [
      `Reflect on today's focus: ${context.focus}. Explain what felt easier, what still needs work, and what you will improve in the next task.`,
      context.historyNote
    ].filter(Boolean).join("\n\n"),
    instructions: appendTeacherNote(
      `Record a short reflection. Keep it honest and practical. ${context.plan.framework ? `Use this structure if helpful: ${context.plan.framework}.` : "Use simple structure: practiced, difficult, next step."}`,
      context.specialInstruction
    ),
    task_type: values.taskType,
    estimated_minutes: String(context.minutes),
    level: context.level,
    focus: context.focus,
    due_date: context.dueDate,
    guiding_phrases: asLines([
      "Today I practiced...",
      "The difficult part was...",
      "I noticed that...",
      "Next time, I will...",
      ...((context.plan.phraseBank || []).slice(0, 2))
    ]),
    checklist: asLines([
      "Say what you practiced.",
      "Name one difficulty.",
      "Name one next step.",
      ...((context.plan.checklistRules || fallbackPlan.checklistRules).slice(0, 3))
    ])
  };
}

function generateSmartTaskDraft({ student, values, index }) {
  const context = buildContext({ student, values, index });
  const writingDraft = createWritingOrMixedDraft(context, values);

  if (writingDraft) {
    return writingDraft;
  }

  const knownStudentDraft = createKnownStudentPairedDraft(context, values);

  if (knownStudentDraft) {
    return knownStudentDraft;
  }

  if (values.taskType === "shadowing") {
    return createShadowingDraft(context, values);
  }

  if (values.taskType === "photo_description") {
    return createPhotoDescriptionDraft(context, values);
  }

  if (values.taskType === "vocabulary_activation") {
    return createVocabularyDraft(context, values);
  }

  if (values.taskType === "pronunciation") {
    return createPronunciationDraft(context, values);
  }

  if (values.taskType === "reflection") {
    return createReflectionDraft(context, values);
  }

  return createSpeakingDraft(context, values);
}

export function generateSmartTaskDrafts({ student, values }) {
  const count = Math.min(Math.max(Number(values.numberOfTasks) || 1, 1), 5);

  return Array.from({ length: count }, (_, index) =>
    generateSmartTaskDraft({ student, values, index })
  );
}

async function attachTaskHistory(students, { teacherId = null } = {}) {
  if (!students.length) {
    return { students, error: null };
  }

  const studentIds = students.map((student) => student.id).filter(Boolean);
  const client = requireSupabaseClient();
  let query = client
    .from("assigned_tasks")
    .select(assignedTaskColumns)
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      students: students.map((student) => ({ ...student, taskHistory: [] })),
      error: null
    };
  }

  const taskHistoryByStudentId = new Map();
  (data || []).forEach((task) => {
    const current = taskHistoryByStudentId.get(task.student_id) || [];
    if (current.length < 12) {
      current.push(task);
    }
    taskHistoryByStudentId.set(task.student_id, current);
  });

  return {
    students: students.map((student) => ({
      ...student,
      taskHistory: taskHistoryByStudentId.get(student.id) || []
    })),
    error: null
  };
}

export async function getSmartTaskBuilderStudents(profile) {
  try {
    if (profile?.role === "teacher") {
      const result = await getAssignedStudentsForTeacher(profile.id);

      if (result.error) {
        return result;
      }

      return attachTaskHistory(result.students, { teacherId: profile.id });
    }

    if (profile?.role !== "admin") {
      return {
        students: [],
        error: "Smart Task Builder is only available for teacher and admin accounts."
      };
    }

    const client = requireSupabaseClient();
    const [
      { data: profiles, error: profilesError },
      { data: learningProfiles, error: learningProfilesError }
    ] = await Promise.all([
      client.from("profiles").select(profileColumns).eq("role", "student").order("full_name", { ascending: true }),
      client.from("student_profiles").select(studentProfileColumns)
    ]);

    if (profilesError || learningProfilesError) {
      return {
        students: [],
        error: normalizeError(profilesError || learningProfilesError)
      };
    }

    const learningProfileByUserId = new Map(
      (learningProfiles || []).map((learningProfile) => [learningProfile.user_id, learningProfile])
    );

    const students = (profiles || []).map((student) => ({
      ...student,
      learningProfile: learningProfileByUserId.get(student.id) || null
    }));

    return attachTaskHistory(students);
  } catch (error) {
    return {
      students: [],
      error: normalizeError(error)
    };
  }
}

async function getTeacherIdForAdminAssignment(client, studentId) {
  const { data: links, error: linkError } = await client
    .from("teacher_students")
    .select("teacher_id, created_at")
    .eq("student_id", studentId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (linkError) {
    return {
      teacherId: null,
      error: normalizeError(linkError)
    };
  }

  const teacherIds = [...new Set((links || []).map((link) => link.teacher_id).filter(Boolean))];

  if (!teacherIds.length) {
    return {
      teacherId: null,
      error: "This student is not linked to an active teacher yet. Link the student to a teacher before assigning a Smart Builder task as admin."
    };
  }

  const { data: teachers, error: teacherError } = await client
    .from("profiles")
    .select("id, role, status")
    .in("id", teacherIds)
    .eq("role", "teacher")
    .eq("status", "active")
    .limit(1);

  if (teacherError) {
    return {
      teacherId: null,
      error: normalizeError(teacherError)
    };
  }

  const teacherId = teachers?.[0]?.id || null;

  if (!teacherId) {
    return {
      teacherId: null,
      error: "No active teacher profile was found for this student. Check the teacher-student link before assigning."
    };
  }

  return {
    teacherId,
    error: null
  };
}

export async function assignSmartTaskDraft({ profile, values }) {
  const isWritingDraft = values?.draft_type === "writing" || values?.task_type === "writing";

  if (!["teacher", "admin"].includes(profile?.role)) {
    return {
      task: null,
      error: "Smart Task Builder assignment is only available for teacher and admin accounts."
    };
  }

  if (isWritingDraft) {
    return createWritingTask({
      profile,
      values: {
        student_id: values.student_id,
        title: values.title,
        prompt: values.prompt,
        instructions: values.instructions,
        level: values.level,
        focus: values.focus,
        due_date: values.due_date,
        min_words: values.min_words
      }
    });
  }

  if (profile?.role === "teacher") {
    return createAssignedTaskForTeacher({
      teacherId: profile.id,
      values
    });
  }

  try {
    const client = requireSupabaseClient();
    const cleanArray = (items) => (Array.isArray(items) && items.length ? items : null);
    const nullableText = (value) => cleanText(value) || null;
    const teacherAssignment = await getTeacherIdForAdminAssignment(client, values.student_id);

    if (teacherAssignment.error) {
      return {
        task: null,
        error: teacherAssignment.error
      };
    }

    const { data, error } = await client
      .from("assigned_tasks")
      .insert({
        student_id: values.student_id,
        teacher_id: teacherAssignment.teacherId,
        title: cleanText(values.title),
        description: nullableText(values.description),
        task_type: values.task_type,
        instructions: nullableText(values.instructions),
        guiding_phrases: cleanArray(values.guiding_phrases),
        checklist: cleanArray(values.checklist),
        estimated_minutes: values.estimated_minutes,
        level: nullableText(values.level),
        focus: nullableText(values.focus),
        due_date: values.due_date || null,
        status: "assigned"
      })
      .select("id, student_id, teacher_id, title, due_date, status, created_at")
      .single();

    if (error) {
      return {
        task: null,
        error: normalizeError(error)
      };
    }

    return {
      task: data,
      error: null
    };
  } catch (error) {
    return {
      task: null,
      error: normalizeError(error)
    };
  }
}
