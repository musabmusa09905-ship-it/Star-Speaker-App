import {
  assignSmartTaskDraft,
  getSmartBuilderStudentProfile,
  getSmartTaskBuilderStudents
} from "./smartTaskBuilder.js";
import { tuesdayJune23TaskPack } from "../data/tuesdayJune23TaskPack.js";
import { requireSupabaseClient } from "./supabaseClient.js";

export const dailyPlannerModes = [
  {
    value: "all",
    label: "Generate selected plan"
  },
  {
    value: "missing",
    label: "Keep existing drafts"
  }
];

export const dailyPlannerScopes = [
  {
    value: "day",
    label: "One day"
  },
  {
    value: "week",
    label: "Full 7-day week"
  }
];

export const weekTwoStartDate = "2026-06-15";
export const weekTwoEndDate = "2026-06-21";
export const manuelCycleStartDate = "2026-06-16";
export const manuelCycleEndDate = "2026-06-21";
export const manuelCycleTaskLimitMessage =
  "This plan allows one task per student per day. Expected task count: 3.";
export const dailyTaskPacks = [tuesdayJune23TaskPack];
export const tuesdayJune23TaskPackId = tuesdayJune23TaskPack.id;
export const tuesdayJune23PlannerDays = tuesdayJune23TaskPack.days || [
  {
    label: "Tuesday",
    date: tuesdayJune23TaskPack.date,
    dayNumber: tuesdayJune23TaskPack.dayNumber,
    status: "ready",
    note: "Imported task cards are ready to review and assign."
  }
];

const oldStudentKeys = new Set(["seyma", "selim", "cemre", "omer", "ege", "ogulcan", "doga"]);
const engineerKeys = new Set(["melih", "yesim", "gizem", "berkay", "anil"]);
const manuelCycleStudentKeys = new Set(["kerem_osmanoglu", "tuba_nur_yilmaz", "arda_calisir"]);

const studentProfiles = {
  seyma: {
    studentKey: "seyma",
    aliases: ["seyma", "seyma efe"],
    level: "B1+",
    taskType: "speaking",
    numberOfTasks: 2,
    estimatedMinutes: 8,
    weeklyFocus: "flight attendant communication, connectors, calm professional speaking",
    note: "150-word read-aloud plus 45-60 second cabin crew speaking answer.",
    goal: "Prepare for a SunExpress flight attendant interview with clear, calm, confident speaking."
  },
  selim: {
    studentKey: "selim",
    aliases: ["selim"],
    level: "B1+",
    taskType: "speaking",
    numberOfTasks: 2,
    estimatedMinutes: 10,
    weeklyFocus: "work English, natural phrases, collocations, grammar accuracy",
    note: "Speaking plus vocabulary activation for natural work English.",
    goal: "Speak more naturally and confidently in daily life and work."
  },
  cemre: {
    studentKey: "cemre",
    aliases: ["cemre"],
    level: "B2",
    taskType: "speaking",
    numberOfTasks: 2,
    estimatedMinutes: 9,
    weeklyFocus: "Italy life abroad, concise speaking, connectors, natural expression",
    note: "45-60 second speaking plus vocabulary activation or reflection.",
    goal: "Prepare for life in Italy and daily English use."
  },
  omer: {
    studentKey: "omer",
    aliases: ["omer", "omer"],
    level: "B1+",
    taskType: "speaking",
    numberOfTasks: 2,
    estimatedMinutes: 9,
    weeklyFocus: "short structured answers, grammar control, answer the real question",
    note: "Structured speaking plus grammar-focused activation.",
    goal: "Clearer speaking, grammar control, confidence."
  },
  ege: {
    studentKey: "ege",
    aliases: ["ege"],
    level: "B1+",
    taskType: "writing",
    numberOfTasks: 2,
    estimatedMinutes: 10,
    weeklyFocus: "IELTS paraphrasing, introductions, speaking framework, pressure control",
    note: "IELTS writing micro-task plus speaking.",
    goal: "IELTS speaking and writing soon."
  },
  ogulcan: {
    studentKey: "ogulcan",
    aliases: ["ogulcan", "ogulcan"],
    level: "A2",
    taskType: "vocabulary_activation",
    numberOfTasks: 2,
    estimatedMinutes: 8,
    weeklyFocus: "A2 English thinking, simple sentences, daily life vocabulary",
    note: "Vocabulary activation plus simple speaking. No IELTS tasks.",
    goal: "Long-term IELTS foundation through simple English thinking."
  },
  doga: {
    studentKey: "doga",
    aliases: ["doga", "doga"],
    level: "A2+",
    taskType: "writing",
    numberOfTasks: 3,
    estimatedMinutes: 8,
    weeklyFocus: "IELTS writing micro-practice, paraphrasing, opinion sentences, light speaking",
    note: "Two writing micro-tasks plus one light speaking task.",
    goal: "IELTS improvement, especially writing."
  },
  eylul: {
    studentKey: "eylul",
    aliases: ["eylul", "eylul"],
    level: "B1+",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 8,
    weeklyFocus: "fun speaking, natural life topics, gentle grammar upgrade",
    note: "One fun speaking task with one natural target structure.",
    goal: "Feel comfortable using English for life and the future."
  },
  arda: {
    studentKey: "arda",
    aliases: ["arda gormez", "arda görmez"],
    level: "A2+",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 8,
    weeklyFocus: "fun speaking, vocabulary activation, simple answer structure",
    note: "One speaking task with five useful words.",
    goal: "Better speaking for general life."
  },
  kerem_osmanoglu: {
    studentKey: "kerem_osmanoglu",
    aliases: ["kerem osmanoglu", "kerem osmanoğlu"],
    level: "A2+ / High Beginner",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 9,
    weeklyFocus: "speaking confidence, useful general vocabulary, syllable reading, simple connectors",
    note: "Manuel six-day cycle: one practical speaking task per selected date.",
    goal: "Build speaking confidence and gradually increase speaking stamina."
  },
  tuba_nur_yilmaz: {
    studentKey: "tuba_nur_yilmaz",
    aliases: ["tuba nur yilmaz", "tuba nur yılmaz", "tuba yilmaz", "tuba yılmaz"],
    level: "Intermediate",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 9,
    weeklyFocus: "speaking fluency, accuracy, synonyms, periphrasis, translator-free expression",
    note: "Manuel six-day cycle: one translator-free speaking task per selected date.",
    goal: "Build speaking fluency and confidence without relying on translators."
  },
  arda_calisir: {
    studentKey: "arda_calisir",
    aliases: ["arda calisir", "arda çalışır"],
    level: "Intermediate",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 10,
    weeklyFocus: "speaking confidence, accuracy, stress, periphrasis, cause-and-effect structure",
    note: "Manuel six-day cycle: one structured cause-and-effect task per selected date.",
    goal: "Transfer grammar knowledge into confident structured speaking."
  },
  melih: {
    studentKey: "melih",
    aliases: ["melih"],
    level: "A2",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 8,
    weeklyFocus: "career English, customer communication, confidence",
    note: "Engineer group prompt: medium difficulty.",
    goal: "Better English for career and future opportunities."
  },
  yesim: {
    studentKey: "yesim",
    aliases: ["yesim", "yesim"],
    level: "A2+",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 9,
    weeklyFocus: "career English, professional confidence, work communication",
    note: "Engineer group prompt: strongest difficulty.",
    goal: "Better English for career and future opportunities."
  },
  gizem: {
    studentKey: "gizem",
    aliases: ["gizem"],
    level: "A2",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 8,
    weeklyFocus: "career English, customer communication, confidence",
    note: "Engineer group prompt: medium difficulty.",
    goal: "Better English for career and future opportunities."
  },
  berkay: {
    studentKey: "berkay",
    aliases: ["berkay", "berkay keklikoglu", "berkay keklikoğlu"],
    level: "A2",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 9,
    weeklyFocus: "career English, customer communication, confidence",
    note: "Engineer group prompt: medium+ difficulty.",
    goal: "Better English for career and future opportunities."
  },
  anil: {
    studentKey: "anil",
    aliases: ["anil", "anil"],
    level: "A1+",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 7,
    weeklyFocus: "simple career English, basic sentences, confidence",
    note: "Engineer group prompt: easiest difficulty.",
    goal: "Better English for career and future opportunities."
  },
  berna: {
    studentKey: "berna",
    aliases: ["berna"],
    level: "Upper Intermediate",
    taskType: "speaking",
    numberOfTasks: 2,
    estimatedMinutes: 8,
    weeklyFocus: "fluency, vocabulary range, grammar cleanup, sentence stress",
    note: "Two upgraded tasks: speaking or vocabulary plus pronunciation, shadowing, or sentence stress.",
    goal: "Improve fluency, vocabulary, confidence, and natural sentence structure."
  },
  burcu: {
    studentKey: "burcu",
    aliases: ["burcu"],
    level: "Intermediate",
    taskType: "speaking",
    numberOfTasks: 2,
    estimatedMinutes: 6,
    weeklyFocus: "structured speaking, confidence, read-aloud practice, useful vocabulary",
    note: "One or two safe, manageable tasks with read-aloud and short structured speaking.",
    goal: "Improve fluency and confidence through clear, manageable speaking practice."
  },
  general: {
    studentKey: "general",
    aliases: [],
    level: "",
    taskType: "speaking",
    numberOfTasks: 1,
    estimatedMinutes: 10,
    weeklyFocus: "speaking clarity, vocabulary activation, consistent practice",
    note: "General focused practice.",
    goal: "Build a consistent English habit."
  }
};

const dayTopics = {
  seyma: [
    { key: "seyma_delay_announcement", title: "Calm Flight Delay Update", topic: "flight delay announcement", speaking: "explaining a delay calmly to passengers", read: "A flight delay is never easy for passengers, but a calm cabin crew member can change the atmosphere. When passengers hear a clear explanation, they feel safer and more respected. The crew should speak slowly, use polite language, and avoid sounding nervous. A good announcement explains the delay, thanks passengers for their patience, and reminds them that safety comes first. Professional communication is not only about giving information. It is also about helping people trust the team during an uncomfortable moment." },
    { key: "seyma_teamwork_cabin_crew", title: "Helping a New Cabin Crew Member", topic: "teamwork with cabin crew", speaking: "helping a new crew member during a busy service", read: "Cabin crew teamwork is important because every small action affects passengers. A new crew member may feel nervous during a busy flight, so a supportive teammate should stay calm and helpful. Good teamwork means noticing problems early, sharing tasks clearly, and speaking with respect. If the crew works together, passengers see confidence and order. A professional flight attendant does not only serve passengers. She also supports her team so the whole cabin feels safe and organized." },
    { key: "seyma_turbulence_reassurance", title: "Reassuring a Passenger During Turbulence", topic: "passenger afraid of turbulence", speaking: "using reassurance language during turbulence", read: "Turbulence can make some passengers feel afraid, even when the situation is normal. A cabin crew member should use a warm voice and simple safety language. She can explain that turbulence is common and that the pilots are trained for it. She should also remind the passenger to keep the seat belt fastened and breathe slowly. The goal is not to give too much technical information. The goal is to help the passenger feel heard, safe, and supported." },
    { key: "seyma_lost_item_polite_problem_solving", title: "Lost Item on Board", topic: "lost item on board", speaking: "polite problem solving for a lost item", read: "When a passenger loses an item on board, they may feel stressed or impatient. A professional cabin crew member should listen carefully, ask clear questions, and explain what she can do next. She can check the seat area, ask another crew member for help, and tell the passenger about the lost item procedure. Even if the item is not found immediately, polite communication matters. A calm and respectful answer helps the passenger feel that the problem is being taken seriously." },
    { key: "seyma_elderly_passenger_support", title: "Respectful Elderly Passenger Support", topic: "elderly passenger support", speaking: "respectful communication with an elderly passenger", read: "Supporting an elderly passenger requires patience, respect, and clear communication. A cabin crew member should not rush the passenger or make them feel weak. She can offer help with luggage, explain instructions slowly, and check if the passenger needs anything during the flight. Respectful support means using polite words and a calm tone. The passenger should feel comfortable, not embarrassed. This kind of service shows professionalism and real care." },
    { key: "seyma_emergency_instruction_clarity", title: "Clear Safety Instructions", topic: "emergency instruction clarity", speaking: "calm safety language in an urgent moment", read: "In an emergency, clear communication is more important than complicated language. A cabin crew member must speak loudly enough, use short instructions, and stay calm. Passengers look at the crew to understand what to do, so confidence matters. The crew should avoid panic and repeat key instructions if necessary. Calm safety language helps people focus. A professional flight attendant knows that her voice can guide passengers when the situation becomes stressful." },
    { key: "seyma_sunexpress_interview_intro", title: "SunExpress Interview Introduction", topic: "SunExpress interview self-introduction", speaking: "professional strengths in a self-introduction", read: "A strong flight attendant interview introduction should sound natural, professional, and confident. The candidate can mention her communication skills, her interest in helping people, and her ability to stay calm under pressure. She should not memorize a robotic answer. Instead, she should speak clearly and connect her strengths to cabin crew work. A good introduction gives the interviewer a reason to trust her. It shows personality, preparation, and professional attitude." }
  ],
  selim: [
    { key: "selim_difficult_work_decision", title: "A Difficult Work Decision", question: "Explain a difficult work decision you had to make. What was the situation, what did you consider, and what did you decide?", vocab: ["make a decision", "deal with pressure", "weigh the options", "take responsibility", "the best solution"] },
    { key: "selim_mistake_learned", title: "A Mistake and What You Learned", question: "Talk about a mistake at work or in daily life and explain what it taught you.", vocab: ["make a mistake", "learn a lesson", "fix the problem", "take it seriously", "next time"] },
    { key: "selim_work_pressure", title: "Handling Pressure at Work", question: "What makes work stressful sometimes, and how do you usually handle pressure?", vocab: ["under pressure", "stay focused", "manage time", "keep calm", "solve the issue"] },
    { key: "selim_improve_skill", title: "Improving a Skill", question: "Explain one skill you are trying to improve and what kind of routine helps you.", vocab: ["build a habit", "improve gradually", "practice regularly", "notice progress", "stay consistent"] },
    { key: "selim_advice_new_teammate", title: "Advice for a New Teammate", question: "Give advice to a new teammate who wants to do well in your workplace.", vocab: ["ask for help", "pay attention", "communicate clearly", "learn the system", "be reliable"] },
    { key: "selim_productivity_focus", title: "Productivity and Focus", question: "What helps you stay productive when there are many things to do?", vocab: ["set priorities", "avoid distractions", "finish tasks", "take a short break", "stay organized"] },
    { key: "selim_future_career_goal", title: "Future Career Goal", question: "Describe one future career goal clearly. Why is it important to you?", vocab: ["career goal", "future opportunity", "gain experience", "become better at", "long-term plan"] }
  ],
  cemre: [
    { key: "cemre_first_conversation_italy", title: "First Real Conversation in Italy", question: "Imagine your first real conversation in Italy. Who are you talking to, what do you say, and how do you want to sound?", secondType: "vocabulary_activation", words: ["settle in", "feel comfortable", "start a conversation", "first impression", "keep it natural"] },
    { key: "cemre_stylish_daily_routine", title: "A Stylish Daily Routine Abroad", question: "Describe a stylish but realistic daily routine you want to have abroad.", secondType: "reflection", words: ["daily routine", "personal style", "look confident", "feel independent", "small habit"] },
    { key: "cemre_culture_shock", title: "Handling Culture Shock", question: "What part of culture shock might be difficult for you, and how would you handle it?", secondType: "vocabulary_activation", words: ["culture shock", "get used to", "feel homesick", "adapt to", "ask for help"] },
    { key: "cemre_making_friends", title: "Making Friends Without Trying Too Hard", question: "How can someone make friends abroad without acting fake or trying too hard?", secondType: "reflection", words: ["be yourself", "join a group", "shared interests", "natural conversation", "trust slowly"] },
    { key: "cemre_fashion_identity_abroad", title: "Fashion and Identity Abroad", question: "How can fashion show part of your personality when you live in another country?", secondType: "vocabulary_activation", words: ["personal identity", "express yourself", "stand out", "fit in", "taste"] },
    { key: "cemre_independent_abroad", title: "Being Independent Away From Home", question: "What does being independent abroad really mean for you?", secondType: "reflection", words: ["make decisions", "handle problems", "be responsible", "learn quickly", "feel proud"] },
    { key: "cemre_person_in_italy", title: "The Person You Want to Become in Italy", question: "Describe the person you want to become in Italy in a short, clear answer.", secondType: "reflection", words: ["future version", "confidence", "independent", "social life", "personal growth"] }
  ],
  omer: [
    { key: "omer_should_advice_clarity", title: "Advice With Should", question: "What should a person do if they want to improve their English speaking?", grammar: "Use should and shouldn't. Keep your answer in 4 clear sentences.", activation: ["should", "shouldn't", "because", "for example", "so"] },
    { key: "omer_past_mistake_simple", title: "A Past Mistake", question: "Talk about one past mistake and what you learned from it.", grammar: "Use past simple verbs. Do not use long sentences.", activation: ["I made", "I learned", "I didn't", "after that", "next time"] },
    { key: "omer_present_simple_routine", title: "Explaining a Routine", question: "Explain one useful routine in your life.", grammar: "Use present simple. Focus on he/she/it -s if needed.", activation: ["usually", "every day", "first", "then", "because"] },
    { key: "omer_compare_choices", title: "Comparing Two Choices", question: "Compare studying alone and studying with a teacher. Which is better for you?", grammar: "Use but and however correctly.", activation: ["on the one hand", "but", "however", "better for me", "the reason is"] },
    { key: "omer_because_so_problem", title: "A Problem With Because and So", question: "Explain one problem you had recently and what happened next.", grammar: "Use because for the reason and so for the result.", activation: ["the problem was", "because", "so", "I decided", "in the end"] },
    { key: "omer_can_could_ability", title: "Ability With Can and Could", question: "Talk about one thing you can do better now than before.", grammar: "Use can, could, and couldn't.", activation: ["before", "I couldn't", "now I can", "I practiced", "I improved"] },
    { key: "omer_four_sentence_opinion", title: "Personal Opinion in 4 Sentences", question: "Do you think short daily practice is useful?", grammar: "Answer in exactly 4 clear sentences: opinion, reason, example, closing.", activation: ["I think", "because", "for example", "that's why", "daily practice"] }
  ],
  ege: [
    { key: "ege_ielts_environment_paraphrasing", title: "IELTS Environment Paraphrasing", writing: "Paraphrase this IELTS-style sentence: Many people believe governments should do more to protect the environment, while others think individuals are responsible.", speaking: "Talk for 45 seconds about how you control exam stress before speaking." },
    { key: "ege_ielts_education_intro", title: "IELTS Education Introduction", writing: "Write an introduction for this IELTS Task 2 question: Some people think students should study alone, while others believe group study is more effective. Discuss both views and give your opinion.", speaking: "Talk for 45 seconds about studying alone and staying disciplined." },
    { key: "ege_ielts_technology_opinion", title: "IELTS Technology Opinion Sentence", writing: "Write one clear opinion sentence for this topic: Technology has made it harder for young people to concentrate.", speaking: "Talk for 45 seconds about what helps you concentrate." },
    { key: "ege_ielts_health_paraphrasing", title: "IELTS Health Paraphrasing", writing: "Paraphrase this IELTS-style sentence: Some people say that a healthy lifestyle depends more on personal discipline than on public health campaigns.", speaking: "Talk for 45 seconds about one healthy habit you want to build." },
    { key: "ege_ielts_work_topic_sentence", title: "IELTS Work Topic Sentence", writing: "Write one strong topic sentence for this idea: Future jobs will require both technical skills and communication skills.", speaking: "Talk for 45 seconds about your future work plans." },
    { key: "ege_ielts_travel_intro", title: "IELTS Travel Introduction", writing: "Write an introduction for this IELTS question: International travel is now easier and cheaper than before. Do the advantages outweigh the disadvantages?", speaking: "Talk for 45 seconds about one useful skill people learn from travel." },
    { key: "ege_ielts_mixed_review_mock", title: "IELTS Mixed Review", writing: "Choose one: paraphrase the environment sentence from Day 8 again OR rewrite your education introduction from Day 9 with clearer grammar.", speaking: "Give one 60-second one-take answer: What is one study habit you need before IELTS?" }
  ],
  ogulcan: [
    { key: "ogulcan_describe_room", title: "Describe Your Room", vocab: ["bed", "desk", "window", "chair", "next to"], question: "Describe your room with 6 simple sentences." },
    { key: "ogulcan_morning_routine", title: "Talk About Your Morning", vocab: ["wake up", "wash", "eat breakfast", "go to", "usually"], question: "Talk about your morning with simple present sentences." },
    { key: "ogulcan_three_objects", title: "Three Objects Around You", vocab: ["phone", "book", "bottle", "near", "use"], question: "Choose three objects around you. Say what they are and why you use them." },
    { key: "ogulcan_food_like", title: "Food You Like", vocab: ["favorite", "delicious", "sometimes", "with my family", "because"], question: "Talk about food you like. Use because in your answer." },
    { key: "ogulcan_weekend_simple", title: "Your Weekend", vocab: ["on Saturday", "on Sunday", "visit", "rest", "watch"], question: "Talk about your weekend with past simple if you can." },
    { key: "ogulcan_family_people", title: "Family or Close People", vocab: ["mother", "friend", "kind", "funny", "helps me"], question: "Describe one family member or close person with simple sentences." },
    { key: "ogulcan_future_i_want", title: "Simple Future Plans", vocab: ["I want to", "learn", "travel", "work", "next year"], question: "Talk about your future plans using I want to." }
  ],
  doga: [
    { key: "doga_education_opinion_reason", title: "Education Opinion Sentence", writingOne: "Write one opinion sentence and one reason for this topic: Online education is useful for teenagers.", writingTwo: "Write one example sentence to support your opinion about online education.", speaking: "Say your opinion about online lessons in 30-40 seconds." },
    { key: "doga_technology_paraphrasing", title: "Technology Paraphrasing", writingOne: "Paraphrase this sentence: Technology helps students learn faster, but it can also distract them.", writingTwo: "Write one simple topic sentence about technology and studying.", speaking: "Talk for 30 seconds about one app that helps students." },
    { key: "doga_health_introduction", title: "Health Introduction Practice", writingOne: "Write a two-sentence introduction for this question: Some people think schools should teach teenagers how to live a healthy life. To what extent do you agree?", writingTwo: "Write one clear opinion sentence about healthy habits at school.", speaking: "Talk for 30 seconds about one healthy habit." },
    { key: "doga_young_people_topic_sentence", title: "Young People Topic Sentence", writingOne: "Write two topic sentences for this topic: Young people spend too much time online.", writingTwo: "Choose your better topic sentence and add one reason.", speaking: "Talk for 30 seconds about screen time." },
    { key: "doga_practical_skills_body", title: "Practical Skills Body Paragraph", writingOne: "Write a short body paragraph about this idea: Schools should teach practical skills such as money management and communication.", writingTwo: "Write one example sentence for the practical skills paragraph.", speaking: "Say one practical skill you want to learn." },
    { key: "doga_environment_opinion", title: "Environment Paraphrasing and Opinion", writingOne: "Paraphrase this sentence: Protecting the environment is one of the most important responsibilities for young people today.", writingTwo: "Write one opinion sentence and one reason about environmental responsibility.", speaking: "Talk for 30 seconds about one small action for the environment." },
    { key: "doga_writing_mini_review", title: "IELTS Writing Mini Review", writingOne: "Rewrite your best sentence from this week and make it clearer.", writingTwo: "Write one new introduction for this question: Some people believe homework should be optional. Do you agree or disagree?", speaking: "Say one thing you learned about writing this week." }
  ],
  eylul: [
    { key: "eylul_relationship_red_flags", title: "Relationship Red Flags and Green Flags", question: "Talk about one red flag and one green flag in relationships. Use: The reason why...", structure: "The reason why..." },
    { key: "eylul_superstition_understands", title: "A Superstition You Secretly Understand", question: "Talk about a superstition you do not fully believe but secretly understand. Use: I have been thinking about...", structure: "I have been thinking about..." },
    { key: "eylul_future_self", title: "The Future Version of Yourself", question: "Describe the future version of yourself. Use: If I were...", structure: "If I were..." },
    { key: "eylul_friendship_rules", title: "Friendship Rules People Should Respect", question: "Talk about one friendship rule people should respect. Use: I would rather...", structure: "I would rather..." },
    { key: "eylul_mental_habit_change", title: "A Mental Habit You Want to Change", question: "Talk about one mental habit you want to change. Use: I realized that...", structure: "I realized that..." },
    { key: "eylul_university_reality", title: "University Expectations vs Reality", question: "Compare university expectations and reality. Use: I used to think...", structure: "I used to think..." },
    { key: "eylul_life_lesson_recent", title: "A Life Lesson You Learned Recently", question: "Talk about one life lesson you learned recently. Use: I realized that...", structure: "I realized that..." }
  ],
  arda: [
    { key: "arda_politics_friends", title: "Should Friends Talk About Politics?", question: "Should friends talk about politics, or is it better to avoid it?", words: ["opinion", "respect", "disagree", "argument", "listen"] },
    { key: "arda_money_relationships", title: "Money and Relationship Problems", question: "Is money the biggest problem in relationships? Explain your opinion.", words: ["trust", "pressure", "security", "responsibility", "problem"] },
    { key: "arda_history_period", title: "A Historical Period You Find Interesting", question: "Describe a historical period you find interesting and explain why.", words: ["period", "society", "power", "change", "leader"] },
    { key: "arda_law_change", title: "One Law You Would Change", question: "If you could change one law, what would it be and why?", words: ["law", "justice", "fair", "rights", "change"] },
    { key: "arda_people_argue", title: "Why People Argue Even When They Agree", question: "Why do people argue even when they actually agree about the main idea?", words: ["misunderstand", "tone", "ego", "point of view", "calm"] },
    { key: "arda_economy_pressure", title: "Economy and Daily Life Pressure", question: "How does the economy affect daily life pressure?", words: ["cost", "salary", "rent", "future", "stress"] },
    { key: "arda_trustworthy_person", title: "What Makes Someone Trustworthy?", question: "What makes someone trustworthy in friendship, work, or law?", words: ["honest", "reliable", "promise", "action", "character"] }
  ],
  berna: [
    {
      key: "berna_day1_speaking_confidence_check",
      title: "My English Confidence",
      speaking: "How do you feel about your English speaking right now, and what do you want to improve this week?",
      supportType: "pronunciation",
      supportTitle: "Sentence Stress for Confident Speaking",
      phrases: ["At this point, I feel that...", "One thing I want to improve is...", "I sometimes struggle with...", "I would like to sound more...", "The main reason is that...", "This week, I want to focus on..."],
      stressText: "At this point, I feel more confident when I organize my ideas clearly. I still want to improve my grammar accuracy and vocabulary range. This week, I want to sound natural, clear, and more controlled when I speak."
    },
    {
      key: "berna_day2_vocabulary_upgrade_life_situation",
      title: "Stronger Phrases for a Difficult Situation",
      speaking: "Describe a difficult work or life situation and explain how stronger English phrases can help you sound more precise.",
      supportType: "vocabulary_activation",
      supportTitle: "Upgrade Your Situation Vocabulary",
      phrases: ["handle a challenging situation", "take responsibility for", "look at the bigger picture", "find a practical solution", "communicate my point clearly", "avoid misunderstanding"],
      stressText: "When I handle a challenging situation, I need to stay calm and explain my point clearly. Strong vocabulary helps me sound more precise and professional."
    },
    {
      key: "berna_day3_sentence_stress_practice",
      title: "Sentence Stress and Word Stress",
      speaking: "Explain why pronunciation and stress matter when you already speak with good fluency.",
      supportType: "pronunciation",
      supportTitle: "Stress the Meaning Words",
      phrases: ["word stress", "sentence stress", "natural rhythm", "main idea", "sound more fluent", "old pronunciation habit"],
      stressText: "I want to improve my sentence stress because stress changes the meaning. If I stress the important words, my English sounds clearer, more natural, and easier to follow."
    },
    {
      key: "berna_day4_fluency_correction_target",
      title: "A Habit I Want to Change in English",
      speaking: "Talk about one English habit or grammar mistake you want to change and why it still appears in your speaking.",
      supportType: "vocabulary_activation",
      supportTitle: "Correction Without Losing Flow",
      phrases: ["old habit", "fossilized mistake", "correct myself", "slow down slightly", "keep my fluency", "build a better pattern"],
      stressText: "I do not want correction to stop my fluency. I want to notice my old patterns, correct them calmly, and continue speaking with confidence."
    },
    {
      key: "berna_day5_advanced_sentence_structure",
      title: "Deeper Opinion With Stronger Structure",
      speaking: "Do you think confidence is more important than accuracy when speaking a foreign language? Explain your opinion with connectors.",
      supportType: "vocabulary_activation",
      supportTitle: "Connector Upgrade",
      phrases: ["Although accuracy matters", "from my perspective", "what makes this difficult is", "in the long term", "as a result", "I would argue that"],
      stressText: "Although accuracy matters, confidence helps people continue speaking. In the long term, both confidence and accuracy should improve together."
    },
    {
      key: "berna_day6_shadowing_professional_rhythm",
      title: "Professional Rhythm Shadowing",
      speaking: "After shadowing the paragraph, explain which part was easiest or hardest to copy.",
      supportType: "shadowing",
      supportTitle: "Copy Professional Rhythm",
      phrases: ["professional tone", "clear rhythm", "natural pause", "important words", "copy the stress", "sound controlled"],
      stressText: "Clear communication is not only about correct grammar. It is also about rhythm, stress, and timing. When I speak with controlled pauses, my message sounds more confident and more professional."
    },
    {
      key: "berna_day7_weekly_speaking_review",
      title: "Weekly Speaking Review",
      speaking: "What improved this week, and what still feels difficult when you speak English?",
      supportType: "pronunciation",
      supportTitle: "Review With Upgraded Phrases",
      phrases: ["I have noticed that", "compared with before", "one improvement is", "I still need to work on", "I feel more aware of", "next week I want to"],
      stressText: "Compared with before, I feel more aware of my speaking habits. I still need to work on accuracy and stress, but I can improve step by step with regular practice."
    }
  ],
  burcu: [
    {
      key: "burcu_day1_read_aloud_confidence",
      title: "My English Confidence",
      question: "Why do you want to speak English more confidently?",
      readText: "Speaking English confidently takes time and practice. It is normal to make mistakes, especially when you are trying to speak faster or explain your ideas. Every small practice helps you become more comfortable. If you speak a little every day, your confidence can grow step by step.",
      phrases: ["I want to speak English more confidently because...", "Sometimes I feel...", "I need English for...", "One thing I want to improve is...", "Step by step, I can...", "This practice will help me..."]
    },
    {
      key: "burcu_day2_answer_reason_example",
      title: "Answer, Reason, Example",
      question: "What is one useful habit in your daily life or work?",
      readText: "A clear answer does not need to be long. First, give your answer. Then explain one reason. Finally, give a simple example. This structure helps you speak calmly and stay organized.",
      phrases: ["My answer is...", "The reason is...", "For example...", "This helps me because...", "In my daily life...", "I think this is useful because..."]
    },
    {
      key: "burcu_day3_read_aloud_word_stress",
      title: "Comfortable Voice and Word Stress",
      question: "Which sentence was easiest to read aloud, and which sentence was more difficult?",
      readText: "I am learning to speak more clearly. I do not need to be perfect. I can read slowly, stress the important words, and use a comfortable voice. Small practice can make speaking easier.",
      phrases: ["The easiest sentence was...", "The difficult part was...", "I need to stress...", "I can improve by...", "I felt comfortable when...", "Next time, I will..."]
    },
    {
      key: "burcu_day4_daily_work_phrases",
      title: "Useful Daily and Work Phrases",
      question: "Choose three phrases and make short sentences about your life or work.",
      readText: "Useful phrases help me speak faster. I can use them at work, at home, or when I explain my ideas. I do not need many phrases at once. I only need to use a few phrases well.",
      phrases: ["I need to...", "I usually...", "At work, I...", "It is important to...", "I am trying to...", "This is useful because..."]
    },
    {
      key: "burcu_day5_speaking_without_fear",
      title: "Speaking Without Fear",
      question: "What makes speaking English difficult sometimes, and what can help you feel calmer?",
      readText: "Making mistakes is part of speaking practice. If I wait until everything is perfect, I may never speak. I can speak slowly, use simple sentences, and continue even if I make a small mistake.",
      phrases: ["Sometimes speaking feels difficult because...", "I feel calmer when...", "One small mistake is okay because...", "I can continue by...", "A simple sentence is enough.", "I want to become braver."]
    },
    {
      key: "burcu_day6_read_aloud_reflection",
      title: "Read Aloud and Reflection",
      question: "After reading, say what was easy and what was difficult today.",
      readText: "Every practice day gives me information. Some sentences are easy, and some sentences are difficult. This does not mean I failed. It means I know what to practice next. I can improve with small, regular steps.",
      phrases: ["Today, the easy part was...", "The difficult part was...", "I noticed that...", "Next time, I want to...", "This was helpful because...", "I can improve step by step."]
    },
    {
      key: "burcu_day7_weekly_confidence_review",
      title: "Weekly Confidence Review",
      question: "What became easier this week, and what do you want to practice next week?",
      readText: "At the end of the week, I can look at my progress. Maybe one word, one sentence, or one short answer became easier. Small progress is still progress. Next week, I can continue with more confidence.",
      phrases: ["This week, I improved...", "One thing became easier...", "I still want to practice...", "I feel more confident when...", "Next week, I can...", "Small progress is important because..."]
    }
  ]
};

const engineerThemes = [
  {
    key: "future_work_identity",
    title: "Future Work Identity",
    prompts: {
      anil: "What job do you want in the future?",
      melih: "What kind of engineer do you want to become?",
      gizem: "What is one thing you want to improve in your work life?",
      berkay: "What skill can make you more valuable at work?",
      yesim: "What kind of professional identity do you want to build in the next five years?"
    }
  },
  {
    key: "pressure_at_work",
    title: "Pressure at Work",
    prompts: {
      anil: "Is your job sometimes difficult?",
      melih: "What makes your work stressful sometimes?",
      gizem: "How do you feel when work is very busy?",
      berkay: "How do you usually handle pressure at work?",
      yesim: "What is the best way to stay professional when work becomes stressful?"
    }
  },
  {
    key: "money_salary_motivation",
    title: "Money, Salary, and Motivation",
    prompts: {
      anil: "Is money important for work?",
      melih: "Does salary affect motivation?",
      gizem: "What motivates you more: money or comfort?",
      berkay: "How can a better salary change someone's life?",
      yesim: "Do you think people should choose a job for money, passion, or future security?"
    }
  },
  {
    key: "customer_problems",
    title: "Customer Problems",
    prompts: {
      anil: "Do you talk to customers at work?",
      melih: "What is one problem customers can have?",
      gizem: "How should workers speak to angry customers?",
      berkay: "What should a company do when a customer is unhappy?",
      yesim: "How can good communication protect a company during a customer problem?"
    }
  },
  {
    key: "technology_engineering",
    title: "Technology Changing Engineering",
    prompts: {
      anil: "Do you use technology at work?",
      melih: "How does technology help engineers?",
      gizem: "What technology makes work easier?",
      berkay: "What skill should engineers learn because of technology?",
      yesim: "How do you think technology will change engineering jobs in the future?"
    }
  },
  {
    key: "work_life_balance",
    title: "Work-Life Balance",
    prompts: {
      anil: "Do you have free time after work?",
      melih: "What do you do after a long workday?",
      gizem: "Is work-life balance important for health?",
      berkay: "How can workers protect their energy after work?",
      yesim: "Why do successful people need both discipline and rest?"
    }
  },
  {
    key: "professional_confidence",
    title: "Confidence in Professional Life",
    prompts: {
      anil: "Do you feel confident at work?",
      melih: "What helps you feel more confident?",
      gizem: "When do you feel confident while speaking?",
      berkay: "How can English make someone more confident at work?",
      yesim: "How can better English change the way people see you professionally?"
    }
  }
];

function cleanText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

function normalizeKey(value) {
  return normalizeName(value).replace(/\s+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeError(error, fallback = "Daily Task Planner could not finish this action. Please try again.") {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return fallback;
  }

  return message;
}

function parseLines(value) {
  if (Array.isArray(value)) {
    return value.map((line) => cleanText(line)).filter(Boolean);
  }

  return cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueId(studentId, index) {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${studentId}-${Date.now()}-${index}-${randomPart}`;
}

function toDateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function parseDateInput(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(startDate, endDate) {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (!start || !end) {
    return 0;
  }

  return Math.round((end - start) / 86400000);
}

function getFirstName(student) {
  const source = cleanText(student?.full_name || student?.email || "Student");
  return source.split(/\s+/)[0] || "Student";
}

function getTopicAt(topics, dayNumber, profile) {
  const baseDay = oldStudentKeys.has(profile.studentKey) ? 8 : 1;
  const index = Math.max(Number(dayNumber) - baseDay, 0) % topics.length;
  return topics[index] || topics[0];
}

function topicWithVariant(topics, dayNumber, profile, variantOffset = 0, excludedFamilies = new Set()) {
  const baseDay = oldStudentKeys.has(profile.studentKey) ? 8 : 1;
  const startIndex = Math.max(Number(dayNumber) - baseDay, 0);

  for (let offset = variantOffset; offset < variantOffset + topics.length; offset += 1) {
    const topic = topics[(startIndex + offset) % topics.length];

    if (!excludedFamilies.has(topic.key)) {
      return topic;
    }
  }

  return topics[startIndex % topics.length] || topics[0];
}

function resolvePlannerStudentKey(student) {
  const normalized = normalizeName(`${student?.full_name || ""} ${student?.email || ""}`);

  for (const profile of Object.values(studentProfiles)) {
    if (profile.studentKey === "general") {
      continue;
    }

    if (profile.aliases.some((alias) => normalized.includes(normalizeName(alias)))) {
      return profile.studentKey;
    }
  }

  return "general";
}

function getPlannerProfile(student) {
  const studentKey = resolvePlannerStudentKey(student);
  return studentProfiles[studentKey] || studentProfiles.general;
}

function makeNormalDraft({
  title,
  taskType = "speaking",
  description,
  instructions,
  estimatedMinutes = 10,
  level,
  focus,
  dueDate,
  guidingPhrases = [],
  checklist = [],
  topicKey,
  topicFamily,
  situationKey,
  plannerDate,
  plannerDayNumber
}) {
  return {
    draft_type: "task",
    task_type: taskType,
    title,
    description,
    instructions,
    estimated_minutes: String(estimatedMinutes),
    level,
    focus,
    due_date: dueDate || "",
    guiding_phrases: guidingPhrases.join("\n"),
    checklist: checklist.join("\n"),
    topic_key: topicKey,
    topic_family: topicFamily || topicKey,
    situation_key: situationKey || topicFamily || topicKey,
    planner_date: plannerDate || dueDate || "",
    planner_day_number: String(plannerDayNumber || ""),
    duplicateWarnings: []
  };
}

function makeWritingDraft({
  title,
  prompt,
  instructions,
  estimatedMinutes,
  minWords = 80,
  level,
  focus,
  dueDate,
  topicKey,
  topicFamily,
  plannerDate,
  plannerDayNumber
}) {
  return {
    draft_type: "writing",
    task_type: "writing",
    title,
    prompt,
    instructions,
    estimated_minutes: estimatedMinutes ? String(estimatedMinutes) : "",
    min_words: String(minWords),
    level,
    focus,
    due_date: dueDate || "",
    topic_key: topicKey,
    topic_family: topicFamily || topicKey,
    planner_date: plannerDate || dueDate || "",
    planner_day_number: String(plannerDayNumber || ""),
    duplicateWarnings: []
  };
}

function normalizeTaskPackTaskType(value) {
  const normalized = normalizeKey(value || "speaking");
  const supportedTaskTypes = new Set([
    "speaking",
    "shadowing",
    "photo_description",
    "vocabulary_activation",
    "pronunciation",
    "reflection",
    "writing"
  ]);

  if (normalized === "photo_description") {
    return "photo_description";
  }

  if (normalized === "vocabulary_activation") {
    return "vocabulary_activation";
  }

  if (normalized === "writing") {
    return "writing";
  }

  return supportedTaskTypes.has(normalized) ? normalized : "speaking";
}

function getTaskPackMissingFields(card) {
  const missing = [];
  const checks = [
    ["Task title", card.taskTitle],
    ["Task type", card.taskType],
    ["Estimated minutes", card.estimatedMinutes],
    ["Level", card.level],
    ["Focus", card.focus],
    ["Description", card.description],
    ["Instructions", card.instructions],
    ["Easy version", card.easyVersion],
    ["Extra challenge", card.extraChallenge],
    ["Goal-based reminder", card.goalReminder]
  ];

  checks.forEach(([label, value]) => {
    if (value === undefined || value === null || !String(value).trim()) {
      missing.push(label);
    }
  });

  if (!Array.isArray(card.guidingPhrases) || card.guidingPhrases.length === 0) {
    missing.push("Guiding phrases");
  }

  if (!Array.isArray(card.checklist) || card.checklist.length === 0) {
    missing.push("Checklist items");
  }

  return missing;
}

export function getDailyPlannerDraftMissingFields(draft) {
  if (!draft?.source_pack_id) {
    return [];
  }

  const missing = [];
  const fieldChecks = [
    ["Task title", draft.title],
    ["Estimated minutes", draft.estimated_minutes],
    ["Level", draft.level],
    ["Focus", draft.focus],
    ["Instructions", draft.instructions],
    ["Easy version", draft.easy_version],
    ["Extra challenge", draft.extra_challenge],
    ["Goal-based reminder", draft.goal_reminder]
  ];

  if (isDailyPlannerWritingDraft(draft)) {
    fieldChecks.push(["Description", draft.prompt]);
  } else {
    fieldChecks.push(["Task type", draft.task_type]);
    fieldChecks.push(["Description", draft.description]);
  }

  fieldChecks.forEach(([label, value]) => {
    if (value === undefined || value === null || !String(value).trim()) {
      missing.push(label);
    }
  });

  if (!parseLines(draft.guiding_phrases).length) {
    missing.push("Guiding phrases");
  }

  if (!parseLines(draft.checklist).length) {
    missing.push("Checklist items");
  }

  return missing;
}

function buildTaskPackSupportInstructions(draft) {
  const supportNotes = [
    draft.easy_version ? `Minimum useful practice: ${cleanText(draft.easy_version)}` : "",
    draft.extra_challenge ? `Extra challenge: ${cleanText(draft.extra_challenge)}` : "",
    draft.goal_reminder ? `Goal-based reminder: ${cleanText(draft.goal_reminder)}` : "",
    draft.series_title ? `Series: ${cleanText(draft.series_title)}` : "",
    draft.scenario_key ? `Scenario key: ${cleanText(draft.scenario_key)}` : "",
    draft.repetition_guard_note ? `Repetition guard note: ${cleanText(draft.repetition_guard_note)}` : ""
  ].filter(Boolean);

  const baseInstructions = cleanText(draft.instructions);

  if (!supportNotes.length) {
    return baseInstructions;
  }

  return [baseInstructions, supportNotes.join("\n")].filter(Boolean).join("\n\n");
}

function getTaskPackStudentScore(student, card) {
  const studentName = normalizeName(student?.full_name || "");
  const studentSearchText = normalizeName(`${student?.full_name || ""} ${student?.email || ""}`);
  const aliases = [card.studentName, ...(card.studentAliases || [])]
    .map((alias) => normalizeName(alias))
    .filter(Boolean);

  return aliases.reduce((bestScore, alias) => {
    const aliasParts = alias.split(" ").filter(Boolean);

    if (studentName === alias) {
      return Math.max(bestScore, 100);
    }

    if (aliasParts.length >= 2 && studentSearchText.includes(alias)) {
      return Math.max(bestScore, 90);
    }

    if (aliasParts.length === 1 && studentName.split(" ")[0] === alias) {
      return Math.max(bestScore, 50);
    }

    return bestScore;
  }, 0);
}

function findStudentForTaskPackCard(students, card) {
  const scored = students
    .map((student) => ({
      student,
      score: getTaskPackStudentScore(student, card)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { student: null, ambiguous: [] };
  }

  const bestScore = scored[0].score;
  const bestMatches = scored.filter((item) => item.score === bestScore);

  if (bestMatches.length > 1 && bestScore < 90) {
    return {
      student: null,
      ambiguous: bestMatches.map((item) => item.student)
    };
  }

  return {
    student: scored[0].student,
    ambiguous: []
  };
}

function createTaskPackDraft({ card, student, index }) {
  const normalizedTaskType = normalizeTaskPackTaskType(card.taskType);
  const dueDate = card.date || tuesdayJune23TaskPack.date;
  const plannerDay = tuesdayJune23PlannerDays.find((day) => day.date === dueDate);
  const missingFields = getTaskPackMissingFields(card);
  const commonMetadata = {
    planner_id: uniqueId(student.id, `pack_${index}`),
    approved: true,
    source_pack_id: tuesdayJune23TaskPack.id,
    source_pack_name: tuesdayJune23TaskPack.name,
    source_pack_expected_count: tuesdayJune23TaskPack.expectedTaskCount,
    source_pack_student_name: card.studentName,
    series_title: card.seriesTitle || "",
    easy_version: card.easyVersion || "",
    extra_challenge: card.extraChallenge || "",
    goal_reminder: card.goalReminder || "",
    scenario_key: card.scenarioKey || "",
    repetition_guard_note: card.repetitionGuardNote || "",
    missingFields,
    status: missingFields.length ? "error" : "idle",
    statusMessage: missingFields.length
      ? `Source card is missing: ${missingFields.join(", ")}. Complete it before assigning.`
      : ""
  };

  if (normalizedTaskType === "writing") {
    return {
      ...makeWritingDraft({
        title: card.taskTitle || "",
        prompt: card.description || "",
        instructions: card.instructions || "",
        estimatedMinutes: card.estimatedMinutes,
        minWords: card.minWords || 80,
        level: card.level || "",
        focus: card.focus || "",
        dueDate,
        topicKey: card.topicKey || normalizeKey(card.taskTitle),
        topicFamily: card.topicKey || normalizeKey(card.seriesTitle),
        plannerDate: dueDate,
        plannerDayNumber: card.dayNumber || plannerDay?.dayNumber || tuesdayJune23TaskPack.dayNumber
      }),
      guiding_phrases: (card.guidingPhrases || []).join("\n"),
      checklist: (card.checklist || []).join("\n"),
      ...commonMetadata
    };
  }

  return {
    ...makeNormalDraft({
      title: card.taskTitle || "",
      taskType: normalizedTaskType,
      description: card.description || "",
      instructions: card.instructions || "",
      estimatedMinutes: card.estimatedMinutes || "",
      level: card.level || "",
      focus: card.focus || "",
      dueDate,
      guidingPhrases: card.guidingPhrases || [],
      checklist: card.checklist || [],
      topicKey: card.topicKey || normalizeKey(card.taskTitle),
      topicFamily: card.topicKey || normalizeKey(card.seriesTitle),
      situationKey: card.scenarioKey || card.topicKey || normalizeKey(card.taskTitle),
      plannerDate: dueDate,
      plannerDayNumber: card.dayNumber || plannerDay?.dayNumber || tuesdayJune23TaskPack.dayNumber
    }),
    ...commonMetadata
  };
}

function speakingChecklist(extra = []) {
  return [
    "Answer the exact question.",
    "Keep your voice clear and controlled.",
    "Use the guiding phrases naturally.",
    "Submit one honest attempt.",
    ...extra
  ];
}

function writingChecklist(extra = []) {
  return [
    "Answer the exact writing prompt.",
    "Use simple, clear sentences.",
    "Check grammar before submitting.",
    ...extra
  ];
}

function createSeymaDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.seyma, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.topic}`;
  const dayLabel = `Day ${dayNumber}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Read Aloud: ${topic.title}`,
      taskType: "shadowing",
      description: topic.read,
      instructions: "Read this 150-word cabin crew text aloud once slowly, then once with a calm professional voice. Focus on clear pauses and friendly confidence.",
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "Thank you for your patience.",
        "I understand your concern.",
        "Safety comes first.",
        "We are doing our best."
      ],
      checklist: speakingChecklist(["Sound professional, not robotic.", "Use calm pauses."]),
      topicKey: `${topic.key}_read_aloud`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: `Record a 45-60 second answer about ${topic.speaking}.`,
      instructions: "Use a cabin crew tone: calm, polite, clear, and practical. Give the situation, your response, and why your response helps the passenger or team.",
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "In this situation, I would...",
        "First of all,",
        "I would stay calm because...",
        "This would help the passenger feel..."
      ],
      checklist: speakingChecklist(["Use at least two connectors.", "Do not repeat an old passenger answer."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createSelimDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.selim, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.question,
      instructions: "Speak for 60-90 seconds. Keep your flow strong, but pause once to choose accurate grammar instead of rushing.",
      estimatedMinutes: 10,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "The main point is...",
        "I had to deal with...",
        "It turned out that...",
        "Next time, I would..."
      ],
      checklist: speakingChecklist(["Use one past tense sentence.", "Keep corrections small so your flow continues."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} Vocabulary: ${topic.title}`,
      taskType: "vocabulary_activation",
      description: `Use these work/life collocations in short example sentences: ${topic.vocab.join(", ")}.`,
      instructions: "Make one sentence for each phrase, then record a 30-second mini answer using at least three of them.",
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.vocab,
      checklist: speakingChecklist(["Use at least three collocations.", "Check the phrase fits the context."]),
      topicKey: `${topic.key}_vocabulary`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createCemreDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.cemre, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.question,
      instructions: "Record a concise 45-60 second answer. Use two connectors and stop when your point is complete.",
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "The main thing is...",
        "At the same time,",
        "For example,",
        "To keep it simple,"
      ],
      checklist: speakingChecklist(["Stay under 60 seconds.", "Do not overexplain."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} ${topic.secondType === "reflection" ? "Reflection" : "Vocabulary"}: ${topic.title}`,
      taskType: topic.secondType,
      description: `Practice these expressions for the topic: ${topic.words.join(", ")}.`,
      instructions: topic.secondType === "reflection"
        ? "Write or record 4 short reflection sentences using at least three expressions."
        : "Make one example sentence for each expression, then say a short answer using three of them.",
      estimatedMinutes: 7,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.words,
      checklist: speakingChecklist(["Use natural expressions.", "Keep it stylish but clear."]),
      topicKey: `${topic.key}_${topic.secondType}`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createOmerDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.omer, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Structured Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.question,
      instructions: `${topic.grammar} Use this frame: answer, reason, example, closing.`,
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.activation,
      checklist: speakingChecklist(["Keep it 45-60 seconds.", "No fancy phrases.", "Answer only the question."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} Grammar Activation: ${topic.title}`,
      taskType: "vocabulary_activation",
      description: `Build five short examples with: ${topic.activation.join(", ")}.`,
      instructions: "Say each sentence aloud, then record a 30-second answer using the grammar target.",
      estimatedMinutes: 7,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.activation,
      checklist: speakingChecklist(["Short sentences only.", "Check one grammar target carefully."]),
      topicKey: `${topic.key}_activation`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createEgeDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.ege, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeWritingDraft({
      title: `${dayLabel} Writing: ${topic.title}`,
      prompt: topic.writing,
      instructions: "Write clearly. Do not use memorized advanced phrases. Focus on one clean IELTS skill today.",
      minWords: 60,
      level: profile.level,
      focus,
      dueDate: date,
      topicKey: `${topic.key}_writing`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.speaking,
      instructions: "Record one answer without stopping. You do not need perfection; you need exam rhythm.",
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "In my opinion,",
        "One reason is...",
        "For example,",
        "This helps me because..."
      ],
      checklist: speakingChecklist(["One take only.", "Control pressure.", "Keep the framework simple."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createOgulcanDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.ogulcan, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Vocabulary: ${topic.title}`,
      taskType: "vocabulary_activation",
      description: `Learn and use these simple words: ${topic.vocab.join(", ")}.`,
      instructions: "Make one simple sentence for each word. Keep the sentence short and correct.",
      estimatedMinutes: 7,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.vocab,
      checklist: speakingChecklist(["Use simple sentences.", "No IELTS words.", "Say each sentence aloud."]),
      topicKey: `${topic.key}_vocabulary`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.question,
      instructions: "Record 30-45 seconds. Use simple English. It is okay if the answer is short.",
      estimatedMinutes: 7,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.vocab,
      checklist: speakingChecklist(["Use at least four simple sentences.", "Think in English first."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createDogaDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.doga, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeWritingDraft({
      title: `${dayLabel} Writing 1: ${topic.title}`,
      prompt: topic.writingOne,
      instructions: "Write a short, clear answer. This is micro-practice, not a full essay.",
      minWords: 45,
      level: profile.level,
      focus,
      dueDate: date,
      topicKey: `${topic.key}_writing_one`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeWritingDraft({
      title: `${dayLabel} Writing 2: ${topic.title}`,
      prompt: topic.writingTwo,
      instructions: "Write one or two clean sentences. Check grammar and word order.",
      minWords: 35,
      level: profile.level,
      focus,
      dueDate: date,
      topicKey: `${topic.key}_writing_two`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} Light Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.speaking,
      instructions: "Record a light 30-40 second answer. Keep it simple and calm.",
      estimatedMinutes: 6,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "I think...",
        "One reason is...",
        "For example,",
        "This is important because..."
      ],
      checklist: speakingChecklist(["Keep it light.", "Do not turn this into a full IELTS answer."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createEylulDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.eylul, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.question,
      instructions: `Record a natural 60-second answer. Grammar upgrade: include "${topic.structure}" once.`,
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        topic.structure,
        "To be honest,",
        "The thing is...",
        "For me,"
      ],
      checklist: speakingChecklist(["Keep it fun and real.", "Use the target structure once."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createArdaDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.arda, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: topic.question,
      instructions: `Record a simple structured answer: opinion, reason, example, closing. Try to use these words: ${topic.words.join(", ")}.`,
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.words,
      checklist: speakingChecklist(["Use at least three useful words.", "Keep the answer simple and clear."]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createEngineerDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(engineerThemes, dayNumber, { studentKey: profile.studentKey }, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const prompt = topic.prompts[profile.studentKey] || topic.prompts.melih;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking: ${topic.title}`,
      taskType: "speaking",
      description: prompt,
      instructions: "Record one clear answer. Use simple work English and give one real example from life or work.",
      estimatedMinutes: profile.estimatedMinutes,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: [
        "In my work life,",
        "One example is...",
        "This is important because...",
        "In the future,"
      ],
      checklist: speakingChecklist(["Do not say only 'my job'. Give one clear example.", "Keep it professional and natural."]),
      topicKey: `${profile.studentKey}_${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createBernaDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.berna, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;
  const supportTaskType = topic.supportType === "shadowing" ? "shadowing" : topic.supportType === "pronunciation" ? "pronunciation" : "vocabulary_activation";

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking Check: ${topic.title}`,
      taskType: "speaking",
      description: topic.speaking,
      instructions: "Record a 60-90 second answer. Speak naturally, but organize your answer clearly. Use at least four guiding phrases and notice one grammar pattern you want to clean up.",
      estimatedMinutes: 8,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.phrases,
      checklist: speakingChecklist([
        "Speak for 60-90 seconds.",
        "Use at least four guiding phrases.",
        "Mention one strength or one clear improvement target.",
        "Keep fluency strong while improving accuracy."
      ]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    }),
    makeNormalDraft({
      title: `${dayLabel} ${formatDailyPlannerType(supportTaskType)}: ${topic.supportTitle}`,
      taskType: supportTaskType,
      description: topic.stressText,
      instructions: supportTaskType === "vocabulary_activation"
        ? "Make one strong example sentence for each phrase. Then read the sentences aloud and stress the meaning words."
        : "Read the text aloud twice. First read slowly for accuracy, then read again with natural rhythm, word stress, and sentence stress.",
      estimatedMinutes: 7,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.phrases,
      checklist: speakingChecklist([
        "Stress the important words.",
        "Avoid old pronunciation habits.",
        "Sound controlled, not robotic."
      ]),
      topicKey: `${topic.key}_${supportTaskType}`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

function createBurcuDrafts({ profile, date, dayNumber, weeklyFocusOverride, variantOffset, excludedTopicFamilies }) {
  const topic = topicWithVariant(dayTopics.burcu, dayNumber, profile, variantOffset, excludedTopicFamilies);
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${topic.title}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Read Aloud and Speaking: ${topic.title}`,
      taskType: "speaking",
      description: `Read the short text aloud, then answer the question.\n\nText:\n${topic.readText}\n\nQuestion:\n${topic.question}`,
      instructions: "First, read the text aloud slowly and clearly. Then record a 45-60 second answer to the question. Use at least three guiding phrases. Do not worry about being perfect.",
      estimatedMinutes: 6,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: topic.phrases,
      checklist: speakingChecklist([
        "Read the full text aloud.",
        "Speak slowly and clearly.",
        "Answer the question.",
        "Speak for 45-60 seconds.",
        "Use at least three guiding phrases.",
        "Do not worry about small mistakes."
      ]),
      topicKey: `${topic.key}_speaking`,
      topicFamily: topic.key,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

const manuelCycleDailyPlans = {
  kerem_osmanoglu: [
    {
      topicKey: "kerem_day1_technical_object_simple_explanation",
      title: "Technical Object in Simple English",
      taskType: "speaking",
      estimatedMinutes: 8,
      duration: "60-90 seconds",
      focus: "Turn technical knowledge into simple general English.",
      description: "Explain one machine, device, tool, or system you understand well to someone who knows nothing about it.",
      instructions: "Choose one technical object or system. Explain what it is, what it does, and why people use it. Use simple words and the connector because. Do not use too many technical words.",
      guidingPhrases: ["It is a kind of...", "People use it to...", "It is useful because...", "One simple example is...", "It helps people..."],
      checklist: ["Speak for 60-90 seconds.", "Use because at least once.", "Explain technical words in simple English.", "Use 5-7 useful words or phrases.", "Keep your sentences short and clear."]
    },
    {
      topicKey: "kerem_day2_describe_without_naming",
      title: "Guess the Object",
      taskType: "vocabulary_activation",
      estimatedMinutes: 9,
      duration: "90 seconds",
      focus: "Vocabulary range, context clues, and simple description.",
      description: "Describe an object without saying its name. Explain what it looks like, what it does, and why people use it.",
      instructions: "Choose one common object. Do not say its name. Describe its shape, place, use, and reason. Record a clear 90-second answer.",
      guidingPhrases: ["It is used for...", "You can find it...", "People use it because...", "It usually looks like...", "It is similar to..."],
      checklist: ["Do not say the object name.", "Speak for about 90 seconds.", "Describe look, place, use, and reason.", "Use the phrase It is used for.", "Use simple vocabulary before difficult vocabulary."]
    },
    {
      topicKey: "kerem_day3_useful_skill_reason_result",
      title: "A Useful Skill Everyone Should Learn",
      taskType: "speaking",
      estimatedMinutes: 10,
      duration: "90-120 seconds",
      focus: "One cause and one result with because and so.",
      description: "Choose one practical skill and explain why it is useful.",
      instructions: "Choose a practical skill such as fixing something, cooking, planning, driving, or using a tool. Explain why people need it and what good result it can create.",
      guidingPhrases: ["One useful skill is...", "This is useful because...", "If people learn it, they can...", "So it helps with...", "For example..."],
      checklist: ["Speak for 90-120 seconds.", "Use because for one reason.", "Use so for one result.", "Give one real example.", "Do not use more than two connectors."]
    },
    {
      topicKey: "kerem_day4_technology_problem_solution",
      title: "A Small Technology Problem",
      taskType: "speaking",
      estimatedMinutes: 10,
      duration: "around 2 minutes",
      focus: "Speaking order, practical vocabulary, and fluency.",
      description: "Describe a technology problem you experienced and how you solved it.",
      instructions: "Talk about a real or realistic technology problem. Explain the problem, what you tried first, what happened next, and the final solution.",
      guidingPhrases: ["The problem was...", "First, I tried to...", "Then, I noticed that...", "In the end...", "The solution worked because..."],
      checklist: ["Speak for around 2 minutes.", "Use First, Then, and In the end.", "Explain the problem simply.", "Explain the solution step by step.", "Use practical technology vocabulary."]
    },
    {
      topicKey: "kerem_day5_good_teammate_qualities",
      title: "What Makes a Good Teammate?",
      taskType: "speaking",
      estimatedMinutes: 12,
      duration: "2-3 minutes",
      focus: "Work vocabulary, confidence, and structured speaking.",
      description: "Explain three qualities of a good teammate.",
      instructions: "Choose three qualities of a good teammate. Explain each quality with a short reason and one example from work, school, or daily life.",
      guidingPhrases: ["A good teammate should...", "This is important because...", "For example...", "Another useful quality is...", "This helps the team..."],
      checklist: ["Speak for 2-3 minutes.", "Give three teammate qualities.", "Use because for each reason.", "Give one example.", "Keep the structure clear."]
    },
    {
      topicKey: "kerem_day6_future_technology_change",
      title: "Technology in the Future",
      taskType: "speaking",
      estimatedMinutes: 12,
      duration: "around 3 minutes",
      focus: "Future speaking, vocabulary range, and a longer answer.",
      description: "Explain one way technology may change daily life or work in the future.",
      instructions: "Choose one future technology change. Explain what may change, who it may affect, and why it may happen. Keep the idea practical and clear.",
      guidingPhrases: ["I think...", "In the future...", "This may happen because...", "It could change...", "One possible result is..."],
      checklist: ["Speak for around 3 minutes.", "Use future language.", "Explain one clear change.", "Give one reason and one result.", "Use wider vocabulary but explain difficult words."]
    }
  ],
  tuba_nur_yilmaz: [
    {
      topicKey: "tuba_day1_explain_without_translation",
      title: "Explain a Word Without Translation",
      taskType: "speaking",
      estimatedMinutes: 8,
      duration: "60-90 seconds",
      focus: "Periphrasis and translator-free expression.",
      description: "Choose one everyday object, emotion, or activity and explain it without saying the Turkish word or using a translator.",
      instructions: "Choose one everyday word. Explain it only in English. Do not use a translator. Use examples, similarities, and situations to make the meaning clear.",
      guidingPhrases: ["It is something that...", "You use it when...", "It is similar to...", "It feels like...", "For example..."],
      checklist: ["Speak for 60-90 seconds.", "Do not use a translator.", "Explain the word in English only.", "Use at least one similarity.", "Stress the important words clearly."]
    },
    {
      topicKey: "tuba_day2_after_work_problem_solution",
      title: "A Small Problem After Work",
      taskType: "speaking",
      estimatedMinutes: 9,
      duration: "90 seconds",
      focus: "Longer sentence building and accuracy.",
      description: "Describe a small problem people can experience after a tiring workday and explain a practical solution.",
      instructions: "Choose one realistic after-work problem. Explain the problem, why it happens, and one useful solution. Use clear and accurate sentences.",
      guidingPhrases: ["One common problem is...", "This can happen when...", "A useful solution would be...", "This works because...", "After that, people can..."],
      checklist: ["Speak for about 90 seconds.", "Describe one problem and one solution.", "Use because accurately.", "Avoid translation.", "Check sentence endings before submitting."]
    },
    {
      topicKey: "tuba_day3_synonym_flexibility",
      title: "Three Ways to Say the Same Idea",
      taskType: "vocabulary_activation",
      estimatedMinutes: 10,
      duration: "around 2 minutes",
      focus: "Synonyms and vocabulary flexibility.",
      description: "Explain one opinion using three different words or phrases.",
      instructions: "Choose one idea such as tired, happy, difficult, useful, or annoying. Explain the idea with three different words or phrases, then use each one in a short spoken example.",
      guidingPhrases: ["Another way to say this is...", "A stronger word is...", "A softer phrase is...", "For example, I can say...", "The meaning is close, but..."],
      checklist: ["Speak for around 2 minutes.", "Use three different words or phrases.", "Give one example for each phrase.", "Do not translate.", "Say the synonyms with clear stress."]
    },
    {
      topicKey: "tuba_day4_describe_place_naturally",
      title: "A Place Someone Should Visit",
      taskType: "speaking",
      estimatedMinutes: 10,
      duration: "2 minutes",
      focus: "Description, sentence stress, and longer answers.",
      description: "Describe a place to someone who has never seen it. Explain the atmosphere, people, and why it is memorable.",
      instructions: "Choose a real place. Describe what it feels like, what people can do there, and why it is special. Use natural description, not translation.",
      guidingPhrases: ["It feels...", "One thing that makes it special is...", "The atmosphere is...", "If you visit, you should...", "What I remember most is..."],
      checklist: ["Speak for 2 minutes.", "Describe atmosphere, people, and reason.", "Use at least three descriptive phrases.", "Stress meaning words.", "Avoid translator-style sentences."]
    },
    {
      topicKey: "tuba_day5_missing_word_strategy",
      title: "When You Cannot Remember a Word",
      taskType: "speaking",
      estimatedMinutes: 12,
      duration: "2-3 minutes",
      focus: "Periphrasis and confidence.",
      description: "Talk about a moment when you could not remember a word. Explain how you could communicate the idea using simpler English.",
      instructions: "Describe a missing-word moment. Explain what word you could not remember and how you can explain the meaning with simpler English.",
      guidingPhrases: ["I could not remember...", "Instead, I could say...", "Another way to explain it is...", "It is a kind of...", "The important idea is..."],
      checklist: ["Speak for 2-3 minutes.", "Use simpler English to explain the missing word.", "Do not use Turkish or a translator.", "Give one example sentence.", "Keep speaking even if one word is missing."]
    },
    {
      topicKey: "tuba_day6_modern_life_choices",
      title: "Do We Have Too Many Choices?",
      taskType: "reflection",
      estimatedMinutes: 12,
      duration: "around 3 minutes",
      focus: "Speaking beyond familiar daily-life topics with accuracy and synonyms.",
      description: "Answer this question: Do people have too many choices in modern life?",
      instructions: "Give your opinion, explain one reason, give one example, and close with a balanced final sentence. Use manageable language and clear structure.",
      guidingPhrases: ["In my opinion...", "One reason is that...", "For example...", "On the other hand...", "My final point is..."],
      checklist: ["Speak for around 3 minutes.", "Give one opinion and one reason.", "Use one example.", "Try one synonym or alternative phrase.", "Do not force advanced academic language."]
    }
  ],
  arda_calisir: [
    {
      topicKey: "arda_c_day1_focus_cause_result",
      title: "Why People Lose Focus",
      taskType: "speaking",
      estimatedMinutes: 9,
      duration: "90 seconds",
      focus: "Cause and result structure.",
      description: "Explain why people lose focus while studying or working and what happens as a result.",
      instructions: "Use this structure: Answer, Cause, Explanation, Result, Closing. Give one clear cause and one clear result. Do not turn this into a grammar explanation.",
      guidingPhrases: ["The main reason is that...", "This happens because...", "As a result...", "This can lead to...", "For this reason..."],
      checklist: ["Speak for 90 seconds.", "Use Answer, Cause, Explanation, Result, Closing.", "Give one cause and one result.", "Stress the words reason and result.", "Close with one clear final sentence."]
    },
    {
      topicKey: "arda_c_day2_social_media_effects",
      title: "Social Media and Communication",
      taskType: "speaking",
      estimatedMinutes: 9,
      duration: "90 seconds",
      focus: "Cause, contrast, and result.",
      description: "Explain one positive and one negative effect of social media on communication.",
      instructions: "Give one positive effect and one negative effect. For each effect, explain the cause and result. Keep the answer structured and meaningful.",
      guidingPhrases: ["One positive effect is...", "This happens because...", "However, one negative effect is...", "As a result...", "Overall, I think..."],
      checklist: ["Speak for 90 seconds.", "Mention one positive and one negative effect.", "Use however for contrast.", "Use because and as a result.", "Avoid repeating the same sentence shape."]
    },
    {
      topicKey: "arda_c_day3_procrastination_consequences",
      title: "Why People Procrastinate",
      taskType: "speaking",
      estimatedMinutes: 10,
      duration: "around 2 minutes",
      focus: "Cause-and-effect sentence building.",
      description: "Explain why people delay important tasks and how this affects their lives.",
      instructions: "Explain one reason people procrastinate, what it causes, and what they can do differently. Use the full cause-and-effect framework.",
      guidingPhrases: ["People often delay tasks because...", "This can create...", "As a result, they may...", "One practical solution is...", "For this reason..."],
      checklist: ["Speak for around 2 minutes.", "Use the required five-part structure.", "Explain cause, consequence, and solution.", "Use cause-and-effect phrases naturally.", "Do not give random grammar theory."]
    },
    {
      topicKey: "arda_c_day4_listening_misunderstanding",
      title: "How Poor Listening Creates Misunderstandings",
      taskType: "speaking",
      estimatedMinutes: 11,
      duration: "2-3 minutes",
      focus: "Listening-linked speaking and cause/result.",
      description: "Explain how poor listening can create misunderstandings and how better listening can improve communication.",
      instructions: "Think about a conversation problem. Explain how poor listening causes misunderstanding, then explain how better listening changes the result.",
      guidingPhrases: ["When people do not listen carefully...", "This can cause...", "The listener may misunderstand...", "Better listening helps because...", "The result is..."],
      checklist: ["Speak for 2-3 minutes.", "Connect listening to communication quality.", "Use at least two cause/result phrases.", "Give one concrete example.", "Stress key words clearly."]
    },
    {
      topicKey: "arda_c_day5_english_career_opportunities",
      title: "English and Career Opportunities",
      taskType: "speaking",
      estimatedMinutes: 12,
      duration: "around 3 minutes",
      focus: "Cause, example, result, and confidence.",
      description: "Explain how stronger English can create better professional opportunities.",
      instructions: "Explain one professional opportunity that English can create. Give a cause, an example, a result, and a confident closing.",
      guidingPhrases: ["Stronger English can help people...", "The main reason is that...", "For example...", "This can lead to...", "In the long term..."],
      checklist: ["Speak for around 3 minutes.", "Use cause, example, and result.", "Connect English to a career situation.", "Keep your answer confident.", "Avoid vague statements."]
    },
    {
      topicKey: "arda_c_day6_performance_stress_solution",
      title: "Performance Stress and Solutions",
      taskType: "reflection",
      estimatedMinutes: 13,
      duration: "3-4 minutes",
      focus: "Longer structured speaking and practical cause/result language.",
      description: "Explain what causes performance stress and what people can do to reduce it.",
      instructions: "Use the Answer, Cause, Explanation, Result, Closing framework. Explain one main cause of performance stress and one practical solution.",
      guidingPhrases: ["Performance stress usually happens when...", "The main cause is...", "This affects people because...", "One way to reduce it is...", "This can lead to a better result because..."],
      checklist: ["Speak for 3-4 minutes.", "Use the full five-part framework.", "Explain one cause and one solution deeply.", "Use practical language.", "Close with a clear final idea."]
    }
  ]
};

function getManuelCycleDayIndex(date) {
  const offset = daysBetween(manuelCycleStartDate, date);
  return offset >= 0 && offset <= 5 ? offset : -1;
}

function createManuelCycleDrafts({ profile, date, dayNumber, weeklyFocusOverride }) {
  const cycleDayIndex = getManuelCycleDayIndex(date);
  const fallbackDayIndex = Math.min(Math.max(Number(dayNumber) || 1, 1), 6) - 1;
  const dayIndex = cycleDayIndex >= 0 ? cycleDayIndex : fallbackDayIndex;
  const plan = manuelCycleDailyPlans[profile.studentKey]?.[dayIndex];

  if (!plan) {
    return createGeneralDrafts({ profile, date, dayNumber, weeklyFocusOverride });
  }

  const dayLabel = `Day ${dayIndex + 1}`;
  const focus = weeklyFocusOverride || `${profile.weeklyFocus}; ${plan.focus}`;

  return [
    makeNormalDraft({
      title: `${dayLabel}: ${plan.title}`,
      taskType: plan.taskType,
      description: plan.description,
      instructions: `${plan.instructions}\n\nTarget speaking time: ${plan.duration}.`,
      estimatedMinutes: plan.estimatedMinutes,
      level: profile.level,
      focus,
      dueDate: date,
      guidingPhrases: plan.guidingPhrases,
      checklist: plan.checklist,
      topicKey: plan.topicKey,
      topicFamily: plan.topicKey,
      situationKey: plan.topicKey,
      plannerDate: date,
      plannerDayNumber: dayIndex + 1
    })
  ];
}

function createGeneralDrafts({ profile, date, dayNumber, weeklyFocusOverride }) {
  const dayLabel = `Day ${dayNumber}`;
  const focus = weeklyFocusOverride || profile.weeklyFocus;
  const topicKey = `general_daily_confidence_${dayNumber}`;

  return [
    makeNormalDraft({
      title: `${dayLabel} Speaking: Daily Confidence Check`,
      taskType: "speaking",
      description: "Talk about one small English action you can complete today and why it matters.",
      instructions: "Record a 45-60 second answer with one reason and one example.",
      estimatedMinutes: 8,
      level: profile.level || "Mixed",
      focus,
      dueDate: date,
      guidingPhrases: [
        "Today I can...",
        "This matters because...",
        "One example is...",
        "My next step is..."
      ],
      checklist: speakingChecklist(),
      topicKey,
      topicFamily: topicKey,
      plannerDate: date,
      plannerDayNumber: dayNumber
    })
  ];
}

const draftFactories = {
  seyma: createSeymaDrafts,
  selim: createSelimDrafts,
  cemre: createCemreDrafts,
  omer: createOmerDrafts,
  ege: createEgeDrafts,
  ogulcan: createOgulcanDrafts,
  doga: createDogaDrafts,
  eylul: createEylulDrafts,
  arda: createArdaDrafts,
  kerem_osmanoglu: createManuelCycleDrafts,
  tuba_nur_yilmaz: createManuelCycleDrafts,
  arda_calisir: createManuelCycleDrafts,
  berna: createBernaDrafts,
  burcu: createBurcuDrafts
};

function createDraftsForProfile(args) {
  const { profile } = args;

  if (engineerKeys.has(profile.studentKey)) {
    return createEngineerDrafts(args);
  }

  const factory = draftFactories[profile.studentKey] || createGeneralDrafts;
  return factory(args);
}

export function isDailyPlannerWritingDraft(draft) {
  return draft?.draft_type === "writing" || draft?.task_type === "writing";
}

export function formatDailyPlannerType(value) {
  return cleanText(value)
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Task";
}

export function getDailyPlannerStudentDefaults(student) {
  const profile = getPlannerProfile(student);
  return {
    ...profile
  };
}

export async function getDailyPlannerStudents(profile) {
  return getSmartTaskBuilderStudents(profile);
}

export function getDailyPlannerDateRange({ planScope = "day", date, startDate, endDate }) {
  const selectedDate = date || startDate || endDate;
  return [selectedDate].filter(Boolean);
}

export function getPlannerDayNumberForDate({ student, date, fallbackDayNumber = 1, startDate = date }) {
  const profile = getPlannerProfile(student);
  const manuelCycleOffset = getManuelCycleDayIndex(date);

  if (manuelCycleStudentKeys.has(profile.studentKey) && manuelCycleOffset >= 0) {
    return manuelCycleOffset + 1;
  }

  const weekTwoOffset = daysBetween(weekTwoStartDate, date);

  if (weekTwoOffset >= 0 && weekTwoOffset <= 6) {
    return oldStudentKeys.has(profile.studentKey)
      ? 8 + weekTwoOffset
      : 1 + weekTwoOffset;
  }

  const customOffset = daysBetween(startDate, date);
  return Math.max(Number(fallbackDayNumber) || 1, 1) + Math.max(customOffset, 0);
}

export function createDailyPlannerDraftsForStudent({
  student,
  date,
  dayNumber,
  weeklyFocusOverride,
  variantOffset = 0,
  excludedTopicFamilies = new Set()
}) {
  const profile = getPlannerProfile(student);
  const drafts = createDraftsForProfile({
    profile,
    student,
    date,
    dayNumber,
    weeklyFocusOverride: cleanText(weeklyFocusOverride),
    variantOffset,
    excludedTopicFamilies
  });

  return drafts.map((draft, index) => ({
    ...draft,
    planner_id: uniqueId(student.id, index),
    approved: true,
    status: "idle",
    statusMessage: "",
    regeneration_count: variantOffset
  }));
}

function getTaskSearchText(task) {
  return normalizeKey([
    task.title,
    task.focus,
    task.description,
    task.prompt,
    task.instructions,
    task.guiding_phrases,
    task.checklist
  ].filter(Boolean).join(" "));
}

function getDraftSearchText(draft) {
  return normalizeKey([
    draft.title,
    draft.focus,
    draft.description,
    draft.prompt,
    draft.instructions,
    draft.topic_key,
    draft.topic_family,
    draft.situation_key,
    draft.guiding_phrases,
    draft.checklist
  ].filter(Boolean).join(" "));
}

function getDraftDuplicateWarnings({ draft, history, weekSeenTitles, weekSeenFamilies }) {
  const warnings = [];
  const normalizedTitle = normalizeKey(draft.title);
  const draftSearchText = getDraftSearchText(draft);

  if (weekSeenTitles.has(normalizedTitle)) {
    warnings.push("This week already has a draft with the same title.");
  }

  const seenFamilyDate = weekSeenFamilies.get(draft.topic_family);
  if (seenFamilyDate && seenFamilyDate !== draft.planner_date) {
    warnings.push("This week already uses the same topic theme for this student.");
  }

  const matchingTitle = history.find((task) => normalizeKey(task.title) === normalizedTitle);

  if (matchingTitle) {
    warnings.push("This student may already have the same title. Regenerate with a new topic.");
  }

  const matchingTopic = history.find((task) => {
    const taskSearchText = getTaskSearchText(task);
    return draft.topic_key && taskSearchText.includes(normalizeKey(draft.topic_key));
  });

  if (matchingTopic) {
    warnings.push("This student may already have the same topic key. Regenerate with a new topic.");
  }

  const similarTask = history.find((task) => {
    const taskSearchText = getTaskSearchText(task);
    const titleWords = normalizedTitle.split("_").filter((word) => word.length > 4);
    return titleWords.length >= 3 && titleWords.filter((word) => taskSearchText.includes(word)).length >= 3;
  });

  if (similarTask && !warnings.some((warning) => warning.includes("similar"))) {
    warnings.push("This student may already have a similar task. Regenerate with a new topic.");
  }

  weekSeenTitles.add(normalizedTitle);
  if (!weekSeenFamilies.has(draft.topic_family)) {
    weekSeenFamilies.set(draft.topic_family, draft.planner_date);
  }

  return [...new Set(warnings)];
}

export async function getExistingDailyTaskWarnings(studentIds, dates = []) {
  const safeStudentIds = [...new Set(studentIds.filter(Boolean))];

  if (!safeStudentIds.length) {
    return {
      warningsByStudentId: new Map(),
      warningsByStudentDateKey: new Map(),
      historyByStudentId: new Map(),
      error: null
    };
  }

  try {
    const client = requireSupabaseClient();
    const [
      { data: assignedTasks, error: assignedError },
      { data: writingTasks, error: writingError }
    ] = await Promise.all([
      client
        .from("assigned_tasks")
        .select("id, student_id, title, description, instructions, guiding_phrases, checklist, focus, due_date, created_at")
        .in("student_id", safeStudentIds)
        .order("created_at", { ascending: false })
        .limit(1000),
      client
        .from("writing_tasks")
        .select("id, student_id, title, prompt, instructions, focus, due_date, created_at")
        .in("student_id", safeStudentIds)
        .order("created_at", { ascending: false })
        .limit(1000)
    ]);

    if (assignedError || writingError) {
      return {
        warningsByStudentId: new Map(),
        historyByStudentId: new Map(),
        error: normalizeError(assignedError || writingError, "Could not check existing tasks.")
      };
    }

    const selectedDates = new Set(dates.filter(Boolean));
    const warningsByStudentId = new Map();
    const warningsByStudentDateKey = new Map();
    const historyByStudentId = new Map();

    [...(assignedTasks || []), ...(writingTasks || [])].forEach((task) => {
      if (!task.student_id) {
        return;
      }

      const history = historyByStudentId.get(task.student_id) || [];
      history.push(task);
      historyByStudentId.set(task.student_id, history);

      if (!selectedDates.has(task.due_date)) {
        return;
      }

      const dateKey = `${task.student_id}|${task.due_date}`;
      const current = warningsByStudentId.get(task.student_id) || {
        count: 0,
        titles: []
      };
      const currentDate = warningsByStudentDateKey.get(dateKey) || {
        count: 0,
        titles: []
      };

      current.count += 1;
      currentDate.count += 1;

      if (task.title && current.titles.length < 3) {
        current.titles.push(task.title);
      }

      if (task.title && currentDate.titles.length < 3) {
        currentDate.titles.push(task.title);
      }

      warningsByStudentId.set(task.student_id, current);
      warningsByStudentDateKey.set(dateKey, currentDate);
    });

    return {
      warningsByStudentId,
      warningsByStudentDateKey,
      historyByStudentId,
      error: null
    };
  } catch (error) {
    return {
      warningsByStudentId: new Map(),
      warningsByStudentDateKey: new Map(),
      historyByStudentId: new Map(),
      error: normalizeError(error, "Could not check existing tasks.")
    };
  }
}

function attachDuplicateWarningsToDrafts(drafts, history) {
  const weekSeenTitles = new Set();
  const weekSeenFamilies = new Map();

  return drafts.map((draft) => ({
    ...draft,
    duplicateWarnings: getDraftDuplicateWarnings({
      draft,
      history,
      weekSeenTitles,
      weekSeenFamilies
    })
  }));
}

function countDuplicateWarnings(drafts) {
  return drafts.reduce((count, draft) => count + (draft.duplicateWarnings?.length || 0), 0);
}

function getCurrentDraftHistoryForStudent(currentGroups, studentId) {
  const groups = currentGroups.filter((item) => item.student?.id === studentId);

  if (!groups.length) {
    return [];
  }

  return groups.flatMap((group) =>
    (group.drafts || []).map((draft) => ({
      id: draft.planner_id,
      student_id: studentId,
      title: draft.title,
      description: draft.description,
      prompt: draft.prompt,
      instructions: draft.instructions,
      guiding_phrases: draft.guiding_phrases,
      checklist: draft.checklist,
      focus: draft.focus,
      due_date: draft.due_date || draft.planner_date,
      created_at: null
    }))
  );
}

function withCrossStudentDuplicateWarnings(groups) {
  const seen = new Map();

  return groups.map((group) => ({
    ...group,
    drafts: group.drafts.map((draft) => {
      const keys = [
        normalizeKey(draft.title),
        normalizeKey(draft.topic_key),
        normalizeKey(draft.topic_family),
        normalizeKey(draft.situation_key),
        getDraftSearchText(draft)
      ].filter(Boolean);
      const duplicateKey = keys.find((key) => seen.has(key) && seen.get(key) !== group.student.id);

      keys.forEach((key) => {
        if (!seen.has(key)) {
          seen.set(key, group.student.id);
        }
      });

      if (!duplicateKey) {
        return draft;
      }

      return {
        ...draft,
        duplicateWarnings: [
          ...(draft.duplicateWarnings || []),
          "Similar task detected. Generate a different task."
        ]
      };
    })
  }));
}

function createCheckedDraftsForSelectedDate({
  student,
  planDate,
  plannerDayNumber,
  weeklyFocusOverride,
  history
}) {
  let bestDrafts = [];
  let bestWarningCount = Number.POSITIVE_INFINITY;

  for (let variantOffset = 0; variantOffset <= 7; variantOffset += 1) {
    const candidateDrafts = createDailyPlannerDraftsForStudent({
      student,
      date: planDate,
      dayNumber: plannerDayNumber,
      weeklyFocusOverride,
      variantOffset,
      excludedTopicFamilies: new Set()
    });
    const checkedDrafts = attachDuplicateWarningsToDrafts(candidateDrafts, history);
    const warningCount = countDuplicateWarnings(checkedDrafts);

    if (warningCount < bestWarningCount) {
      bestDrafts = checkedDrafts;
      bestWarningCount = warningCount;
    }

    if (warningCount === 0) {
      break;
    }
  }

  return bestDrafts;
}

export function isManuelSixDayCycleSelection({ students = [], selectedStudentIds = [], date }) {
  if (getManuelCycleDayIndex(date) < 0) {
    return false;
  }

  const selectedIds = new Set(selectedStudentIds);
  const selectedKeys = students
    .filter((student) => selectedIds.has(student.id))
    .map((student) => resolvePlannerStudentKey(student));

  if (selectedKeys.length !== manuelCycleStudentKeys.size) {
    return false;
  }

  return selectedKeys.every((key) => manuelCycleStudentKeys.has(key));
}

export function getDailyPlannerTaskCountGuard({ students, selectedStudentIds, date, draftCount }) {
  if (
    isManuelSixDayCycleSelection({ students, selectedStudentIds, date }) &&
    Number(draftCount) > manuelCycleStudentKeys.size
  ) {
    return manuelCycleTaskLimitMessage;
  }

  return "";
}

export async function loadTuesdayJune23TaskPackGroups({ students = [], currentGroups = [] }) {
  const matchedStudentIds = new Set();
  const missingStudents = [];
  const ambiguousStudents = [];
  const incompleteTasks = [];
  const matchedCardsByStudentId = new Map();

  tuesdayJune23TaskPack.tasks.forEach((card, index) => {
    const match = findStudentForTaskPackCard(students, card);

    if (match.ambiguous.length) {
      ambiguousStudents.push({
        studentName: card.studentName,
        matches: match.ambiguous.map((student) => student.full_name || student.email || student.id)
      });
      return;
    }

    if (!match.student) {
      missingStudents.push(card.studentName);
      return;
    }

    const draft = createTaskPackDraft({ card, student: match.student, index });
    const missingFields = getDailyPlannerDraftMissingFields(draft);

    if (missingFields.length) {
      incompleteTasks.push({
        studentName: card.studentName,
        title: card.taskTitle || "Untitled source card",
        missingFields
      });
    }

    matchedStudentIds.add(match.student.id);

    const current = matchedCardsByStudentId.get(match.student.id) || {
      student: match.student,
      drafts: []
    };

    current.drafts.push(draft);
    matchedCardsByStudentId.set(match.student.id, current);
  });

  const warningResult = await getExistingDailyTaskWarnings(
    [...matchedStudentIds],
    tuesdayJune23PlannerDays.map((day) => day.date)
  );
  const existingGroupsByStudentId = new Map(currentGroups.map((group) => [group.student.id, group]));

  const groups = [...matchedCardsByStudentId.values()].map(({ student, drafts }) => {
    const history = [
      ...(warningResult.historyByStudentId.get(student.id) || []),
      ...getCurrentDraftHistoryForStudent(currentGroups, student.id)
    ];
    const checkedDrafts = attachDuplicateWarningsToDrafts(drafts, history).map((draft) => {
      const sameDateWarning = warningResult.warningsByStudentDateKey.get(`${student.id}|${draft.due_date}`);
      const duplicateWarnings = [
        ...(draft.duplicateWarnings || []),
        ...(sameDateWarning?.count
          ? [
              `This student already has ${sameDateWarning.count} task${sameDateWarning.count === 1 ? "" : "s"} on ${draft.due_date}.`
            ]
          : [])
      ];

      return {
        ...draft,
        duplicateWarnings: [...new Set(duplicateWarnings)]
      };
    });

    return {
      ...(existingGroupsByStudentId.get(student.id) || {}),
      student,
      studentProfile: getSmartBuilderStudentProfile(student),
      defaults: getDailyPlannerStudentDefaults(student),
      warning: warningResult.warningsByStudentId.get(student.id) || null,
      drafts: checkedDrafts
    };
  });

  return {
    groups,
    missingStudents,
    ambiguousStudents,
    incompleteTasks,
    sourceCount: tuesdayJune23TaskPack.tasks.length,
    expectedTaskCount: tuesdayJune23TaskPack.expectedTaskCount,
    weekDays: tuesdayJune23PlannerDays,
    draftCount: groups.reduce((count, group) => count + group.drafts.length, 0),
    warningError: warningResult.error
  };
}

export async function generateDailyPlannerGroups({
  students,
  selectedStudentIds,
  date,
  startDate,
  endDate,
  planScope = "day",
  dayNumber,
  weeklyFocusOverride,
  mode = "all",
  currentGroups = []
}) {
  const selectedIds = new Set(selectedStudentIds);
  const dateRange = getDailyPlannerDateRange({
    planScope,
    date,
    startDate,
    endDate
  });
  const selectedDate = dateRange[0];

  if (!selectedDate) {
    return {
      groups: [],
      warningError: null,
      dateCount: 0,
      draftCount: 0
    };
  }

  const existingGroupsByStudentId = new Map(
    currentGroups.map((group) => [group.student.id, group])
  );
  const warningResult = await getExistingDailyTaskWarnings([...selectedIds], dateRange);

  const groups = students
    .filter((student) => selectedIds.has(student.id))
    .map((student) => {
      const existingGroup = existingGroupsByStudentId.get(student.id);

      if (mode === "missing" && existingGroup?.drafts?.length) {
        return {
          ...existingGroup,
          warning: warningResult.warningsByStudentId.get(student.id) || null
        };
      }

      const history = [
        ...(warningResult.historyByStudentId.get(student.id) || []),
        ...getCurrentDraftHistoryForStudent(currentGroups, student.id)
      ];
      const plannerDayNumber = getPlannerDayNumberForDate({
        student,
        date: selectedDate,
        fallbackDayNumber: dayNumber,
        startDate: selectedDate
      });
      const drafts = createCheckedDraftsForSelectedDate({
        student,
        planDate: selectedDate,
        plannerDayNumber,
        weeklyFocusOverride,
        history
      });

      return {
        student,
        studentProfile: getSmartBuilderStudentProfile(student),
        defaults: getDailyPlannerStudentDefaults(student),
        warning: warningResult.warningsByStudentId.get(student.id) || null,
        drafts: attachDuplicateWarningsToDrafts(drafts, history)
      };
    });

  const groupsWithCrossStudentWarnings = withCrossStudentDuplicateWarnings(groups);
  const draftCount = groupsWithCrossStudentWarnings.reduce((count, group) => count + group.drafts.length, 0);
  const guardMessage = getDailyPlannerTaskCountGuard({
    students,
    selectedStudentIds,
    date: selectedDate,
    draftCount
  });

  return {
    groups: guardMessage ? [] : groupsWithCrossStudentWarnings,
    warningError: warningResult.error,
    blockError: guardMessage,
    dateCount: dateRange.length,
    draftCount: guardMessage ? 0 : draftCount
  };
}

export function normalizeDailyPlannerDraftForAssignment(student, draft) {
  if (isDailyPlannerWritingDraft(draft)) {
    return {
      draft_type: "writing",
      task_type: "writing",
      student_id: student.id,
      title: cleanText(draft.title),
      prompt: cleanText(draft.prompt),
      instructions: draft.source_pack_id
        ? buildTaskPackSupportInstructions(draft)
        : cleanText(draft.instructions),
      level: cleanText(draft.level),
      focus: cleanText(draft.focus),
      due_date: draft.due_date || null,
      min_words: Math.round(Number(draft.min_words) || 80)
    };
  }

  return {
    draft_type: "task",
    student_id: student.id,
    title: cleanText(draft.title),
    description: cleanText(draft.description),
    instructions: draft.source_pack_id
      ? buildTaskPackSupportInstructions(draft)
      : cleanText(draft.instructions),
    task_type: draft.task_type || "speaking",
    estimated_minutes: Math.round(Number(draft.estimated_minutes) || 10),
    level: cleanText(draft.level),
    focus: cleanText(draft.focus),
    due_date: draft.due_date || null,
    guiding_phrases: parseLines(draft.guiding_phrases),
    checklist: parseLines(draft.checklist)
  };
}

export async function assignDailyPlannerDraft({ profile, student, draft }) {
  return assignSmartTaskDraft({
    profile,
    values: normalizeDailyPlannerDraftForAssignment(student, draft)
  });
}
