// Static UI copy for Library page guidance. Real library resources come from Supabase.
export const mockLibraryData = {
  header: {
    title: "Library",
    subtitle: "Prepare, speak, and improve with focused resources."
  },
  filters: [
    "All",
    "IELTS",
    "Fluency",
    "Pronunciation",
    "Vocabulary",
    "Conversation",
    "Photo Prompts"
  ],
  recommendations: {
    hasRealData: false,
    title: "No teacher recommendations yet",
    message:
      "Teacher-recommended resources will appear here when they support your speaking goals.",
    cta: "Go to Practice"
  },
  categories: [
    {
      title: "Videos",
      description: "Models and guides you can use before recording.",
      status: "No resources yet",
      icon: "video"
    },
    {
      title: "Articles",
      description: "Short reading support for clearer speaking ideas.",
      status: "No resources yet",
      icon: "article"
    },
    {
      title: "Stories",
      description: "Short reads to build vocabulary and confidence.",
      status: "No resources yet",
      icon: "book"
    },
    {
      title: "Photo Prompts",
      description: "Images and prompts for describing what you see.",
      status: "No resources yet",
      icon: "image"
    },
    {
      title: "Weekly Packs",
      description: "Teacher-assigned resources for your weekly focus.",
      status: "No resources yet",
      icon: "calendar"
    },
    {
      title: "Speaking Prompts",
      description: "Questions that help you prepare and speak clearly.",
      status: "No resources yet",
      icon: "mic"
    },
    {
      title: "Pronunciation Drills",
      description: "Focused drills for sounds, rhythm, and stress.",
      status: "No resources yet",
      icon: "target"
    }
  ],
  weeklyPacks: {
    title: "Weekly Packs",
    message:
      "Your weekly resource packs will appear here when your teacher assigns them."
  },
  method: {
    title: "How the Library supports your speaking",
    text:
      "Choose one resource, then use it in your next recording.",
    steps: [
      {
        title: "Learn",
        text: "Review one focused idea before practice.",
        icon: "book"
      },
      {
        title: "Speak",
        text: "Use the idea in a short recording.",
        icon: "mic"
      },
      {
        title: "Get feedback",
        text: "Apply your teacher's next correction.",
        icon: "feedback"
      }
    ]
  },
  savedResources: {
    title: "Saved Resources",
    message: "Saved resources will appear here when this tool is available."
  }
};
