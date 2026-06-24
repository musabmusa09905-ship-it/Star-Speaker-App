import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function WeeklyHabitStatus({ habit }) {
  if (!habit) {
    return null;
  }

  const isComplete = habit.todayStatus?.toLowerCase().includes("completed");

  return (
    <section className="card practice-week-card practice-habit-card mascot-card mascot-card--compact" aria-labelledby="practice-week-title">
      <div className="mascot-card-content practice-habit-card__body">
        <div className="practice-habit-card__top">
          <div>
            <p className="card-eyebrow card-eyebrow--red">Daily output habit</p>
            <h2 id="practice-week-title">Current streak</h2>
          </div>
          <div className="practice-habit-card__count" aria-label={`${habit.currentStreak} day current streak`}>
            <strong>{habit.currentStreak}</strong>
            <span>{habit.currentStreak === 1 ? "day" : "days"}</span>
          </div>
        </div>

        <div className="practice-habit-card__status">
          <strong>{habit.todayStatus}</strong>
          <p>{habit.message}</p>
        </div>

        <div className="practice-day-row practice-day-row--active" aria-label="Last 7 days output activity">
          {habit.recentDays.map((day) => (
            <span
              className={`${day.active ? "is-active" : ""} ${day.isToday ? "is-today" : ""}`}
              key={day.dateKey}
            >
              <i aria-hidden="true">{day.count}</i>
              <b>{day.label}</b>
            </span>
          ))}
        </div>

        <p className="practice-habit-card__note">Every submitted speaking or writing task counts toward your consistency.</p>

        {habit.startHref ? (
          <a className="secondary-button practice-habit-card__button" href={habit.startHref}>
            Start your first task
          </a>
        ) : null}
      </div>

      <div className="mascot-card-visual">
        <MascotAnimation
          type={isComplete ? "celebration" : "progress"}
          size="small"
          motion={isComplete ? "celebrate" : "progress"}
          loop={!isComplete}
          label={isComplete ? "Celebration mascot for completed output habit" : "Progress mascot for output habit"}
        />
      </div>
    </section>
  );
}
