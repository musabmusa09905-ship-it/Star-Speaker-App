// Static UI copy for Profile page empty states and guidance. Real profile data comes from Supabase.
export const mockProfileData = {
  header: {
    title: "Profile",
    subtitle: "Your learning identity and practice rhythm."
  },
  summary: {
    title: "Student profile",
    displayName: "Student",
    status: "Profile not connected yet",
    message: "Your account details will appear here after your profile is connected."
  },
  learningGoal: {
    title: "Learning Goal",
    message:
      "Your main English goal will appear after your teacher sets your learning profile.",
    futureGoals: [
      "Speaking Confidence",
      "IELTS Speaking",
      "Fluency",
      "Pronunciation",
      "Business English",
      "Prep School Support",
      "Travel English"
    ]
  },
  levelFocus: {
    title: "Level and Focus",
    message:
      "Your level and focus areas will appear after your teacher updates your learning profile.",
    futureFields: [
      "Current level",
      "Speaking focus",
      "Pronunciation focus",
      "Vocabulary focus",
      "Weekly focus"
    ]
  },
  teacher: {
    title: "Teacher",
    message: "Your teacher information will appear after your school links your account.",
    futureFields: ["Teacher name", "Teacher role", "Support note", "Weekly focus"]
  },
  preferences: {
    title: "Speaking Habit Preferences",
    note: "Your reminder rhythm helps you show up every day.",
    items: [
      "Preferred daily practice time",
      "Reminder preference",
      "Voice task difficulty",
      "Practice duration target"
    ]
  },
  appSettings: {
    title: "App Settings",
    items: [
      "Notifications",
      "Language",
      "Privacy",
      "Help and Support",
      "Terms and School Rules"
    ]
  },
  support: {
    title: "Need help?",
    message:
      "Ask your teacher or school team when something blocks your speaking practice.",
    cta: "Contact Support",
    note: "Support contact can be added by your school."
  },
  logout: {
    title: "Account",
    message: "Sign out when you are finished on this device."
  }
};
