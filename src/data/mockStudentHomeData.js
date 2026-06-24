// Static UI copy for student dashboard structure. Real student data comes from Supabase.
export const mockStudentHomeData = {
  user: {
    name: null,
    initials: "S",
    role: "Student profile",
    notifications: 0,
    greeting: "Welcome back",
    note: "Small speaking wins become confidence over time."
  },
  navItems: [
    { label: "Home", href: "/", icon: "home" },
    { label: "Practice", href: "/practice", icon: "target" },
    { label: "Record", href: "/record", icon: "mic", primary: true },
    { label: "Feedback", href: "/feedback", icon: "feedback" },
    { label: "Library", href: "/library", icon: "book" },
    { label: "Consistency Board", href: "/leaderboard", icon: "progress", mobileLabel: "Board" },
    { label: "Progress", href: "/progress", icon: "progress" },
    { label: "Profile", href: "/profile", icon: "profile" }
  ],
  streak: {
    hasRealData: false,
    count: null,
    title: "Start your daily streak",
    status: "No streak yet",
    message: "Submit your first speaking task to begin."
  },
  todayTask: {
    hasAssignedTask: false,
    label: "Today's Speaking Task",
    title: "No assigned task yet",
    description: "Your teacher has not assigned a practice task yet.",
    cta: "Check Practice",
    href: "/practice"
  },
  weeklyProgress: {
    hasRealData: false,
    eyebrow: "This Week",
    title: "Progress Overview",
    message: "Your weekly activity will appear after your first submitted recording.",
    days: ["M", "T", "W", "T", "F", "S", "S"]
  },
  quickActions: [
    { label: "Daily Practice", href: "/practice", icon: "target" },
    { label: "Voice Recording", href: "/record", icon: "mic" },
    { label: "Feedback", href: "/feedback", icon: "feedback" },
    { label: "Consistency Board", href: "/leaderboard", icon: "progress" },
    { label: "Progress", href: "/progress", icon: "progress" },
    { label: "Library", href: "/library", icon: "book" }
  ],
  mission: {
    eyebrow: "Habit Starter",
    title: "Build your speaking habit",
    text: "Small daily speaking wins become confidence over time.",
    cta: "View Practice",
    href: "/practice"
  },
  teacherFocus: {
    hasRealData: false,
    eyebrow: "Teacher's Weekly Focus",
    title: "Teacher focus will appear here",
    text: "Your teacher's focus gives you one clear thing to improve."
  }
};
