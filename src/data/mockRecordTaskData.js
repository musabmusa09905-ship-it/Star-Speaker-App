// Static UI copy for Record page states. Real task data comes from Supabase.
export const mockRecordTaskData = {
  emptyState: {
    title: "No task selected",
    message: "Choose a speaking task from Daily Practice to start one short recording.",
    cta: "Go to Practice"
  },
  recording: {
    status: "Ready to record",
    timer: "00:00 / 01:30",
    helper: "Tap to start. One clear attempt is enough.",
    actions: ["Reset", "Preview", "Save draft"]
  },
  reflection: {
    title: "Self-reflection",
    question: "What felt clear or difficult?",
    placeholder: "Write one thing you want your teacher to notice."
  },
  submit: {
    cta: "Submit Recording",
    message: "Record your answer first. Submit when the message is clear enough."
  }
};
