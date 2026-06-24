// Static UI copy for Feedback page empty states and guidance. Real submissions and feedback come from Supabase.
export const mockFeedbackData = {
  header: {
    title: "Feedback",
    subtitle: "Use your teacher's notes to improve one recording at a time."
  },
  emptyState: {
    title: "No feedback yet",
    message:
      "No feedback yet. Once your teacher reviews your work, it will appear here.",
    cta: "Go to Practice",
    note: "Submit a speaking task first, then return here for coaching notes."
  },
  weeklyReview: {
    hasRealData: false,
    title: "Teacher's Weekly Review",
    message:
      "Your weekly review will appear here after your teacher reviews your submissions."
  },
  recentFeedback: {
    hasItems: false,
    title: "Recent feedback will appear here",
    message:
      "Your submitted recordings will show teacher notes, corrections, and next-focus guidance."
  },
  method: {
    title: "How feedback works",
    text:
      "Your teacher helps you improve one clear speaking habit at a time.",
    items: [
      {
        title: "Clarity",
        text: "Make your message easier to understand.",
        icon: "feedback"
      },
      {
        title: "Confidence",
        text: "Speak with a steadier rhythm.",
        icon: "mic"
      },
      {
        title: "Correction",
        text: "Choose one thing to improve next.",
        icon: "target"
      }
    ]
  },
  correctionBank: {
    hasRealData: false,
    title: "Correction Bank",
    message:
      "Useful corrections will collect here as your teacher reviews more recordings."
  },
  nextFocus: {
    hasRealData: false,
    title: "Next Focus",
    message:
      "Your next speaking focus will appear here after teacher review."
  }
};
