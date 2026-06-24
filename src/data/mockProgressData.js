// Static UI copy for Progress page empty states and guidance. Real progress data comes from Supabase.
export const mockProgressData = {
  header: {
    title: "Progress",
    subtitle: "Track your speaking consistency and feedback over time."
  },
  emptyState: {
    title: "Your progress starts with your first task",
    message:
      "Submit a speaking task and your consistency, feedback, and improvement will appear here.",
    cta: "Go to Practice"
  },
  consistency: {
    hasRealData: false,
    title: "Consistency Overview",
    message:
      "Your streak and completion rate will appear after your first submitted recording."
  },
  weeklyCompletion: {
    hasRealData: false,
    title: "Weekly Completion",
    message:
      "Your weekly practice pattern will appear once you start submitting recordings.",
    days: ["M", "T", "W", "T", "F", "S", "S"]
  },
  improvement: {
    hasRealData: false,
    title: "Speaking Improvement",
    message:
      "Improvement areas will appear after your teacher reviews your recordings.",
    areas: [
      "Fluency",
      "Confidence",
      "Pronunciation",
      "Accuracy",
      "Vocabulary Activation"
    ]
  },
  milestones: {
    hasRealData: false,
    title: "Milestones",
    items: [
      "First speaking task",
      "3-day practice streak",
      "First teacher feedback",
      "First weekly review",
      "10 completed tasks"
    ]
  },
  beforeAfter: {
    hasRealData: false,
    title: "Before and After",
    message:
      "Your first and latest recordings will appear here so you can hear your progress over time."
  },
  nextFocus: {
    hasRealData: false,
    title: "Next Focus",
    message:
      "Your next improvement focus will appear after your teacher reviews your work."
  }
};
