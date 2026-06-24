import { FlameIcon } from "./icons.jsx";

export function StreakCard({ streak }) {
  const hasStreak = streak.hasRealData && typeof streak.count === "number";

  return (
    <section className="card streak-card" aria-labelledby="streak-title">
      <div className="streak-card__flame" aria-hidden="true">
        <FlameIcon />
      </div>
      <div className="streak-card__body">
        <p className="card-eyebrow">{streak.status}</p>
        <h2 id="streak-title">{streak.title}</h2>
      </div>
      <div className="streak-card__message">
        {hasStreak && (
          <p className="streak-card__count">
            {streak.count} <span>days</span>
          </p>
        )}
        <span>{streak.message}</span>
      </div>
    </section>
  );
}
