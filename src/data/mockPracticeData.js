// Static UI copy for practice empty states and guidance. Real tasks come from Supabase.
export const mockPracticeData = {
  header: {
    title: "Daily Practice",
    subtitle: "Choose one task, speak, submit, and improve."
  },
  weeklyHabit: {
    hasRealData: false,
    title: "Your speaking week starts here",
    message: "Submit your first speaking task to begin tracking your habit.",
    days: ["M", "T", "W", "T", "F", "S", "S"]
  },
  todayPractice: {
    hasAssignedTasks: false,
    title: "Your teacher has not assigned a practice task yet.",
    message: "When a task is ready, it will appear here with a clear speaking goal.",
    cta: "Check Practice later",
    tasks: []
  },
  categories: [
    { label: "Speaking", icon: "mic" },
    { label: "Pronunciation", icon: "feedback" },
    { label: "Vocabulary Activation", icon: "book" },
    { label: "Fluency", icon: "progress" },
    { label: "Photo Description", icon: "target" }
  ],
  teacherNotice: {
    title: "Teacher-assigned practice",
    message:
      "Your teacher chooses tasks that match your level, goal, and current speaking focus."
  },
  weeklyPlan: {
    hasRealData: false,
    title: "This week's plan will appear here",
    message: "Your teacher's weekly plan will appear here when it is ready.",
    items: []
  }
};
