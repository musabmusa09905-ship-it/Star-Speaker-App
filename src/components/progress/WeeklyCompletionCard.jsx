import { ProgressSkeleton } from "./ProgressSkeleton.jsx";

export function WeeklyCompletionCard({ weeklyCompletion }) {
  return (
    <section className="card progress-card weekly-completion-card" aria-labelledby="weekly-completion-title">
      <p className="card-eyebrow card-eyebrow--red">This week</p>
      <h2 id="weekly-completion-title">{weeklyCompletion.title}</h2>
      <p>{weeklyCompletion.message}</p>
      <ProgressSkeleton days={weeklyCompletion.days} />
    </section>
  );
}
