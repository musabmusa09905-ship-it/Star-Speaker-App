export function WeeklyProgressCard({ progress }) {
  const hasProgress = progress.hasRealData;

  return (
    <section className="card weekly-card" aria-labelledby="weekly-title">
      <div className="weekly-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">{progress.eyebrow}</p>
          <h2 id="weekly-title">{progress.title}</h2>
        </div>
        {hasProgress && (
          <div className="weekly-card__goal">
            Goal
            <strong>{progress.goal}%</strong>
          </div>
        )}
      </div>

      {hasProgress ? (
        <div className="weekly-card__content">
          <div
            className="progress-ring"
            style={{ "--progress": `${progress.percentage}%` }}
            aria-label={`${progress.percentage}% weekly goal completed`}
          >
            <div>
              <strong>{progress.percentage}%</strong>
              <span>Weekly Goal</span>
            </div>
          </div>

          <div className="weekly-bars" aria-label="Seven day progress">
            {progress.days.map((day, index) => (
              <div className="weekly-bars__day" key={`${day.label}-${index}`}>
                <div className="weekly-bars__track">
                  <span
                    className={`weekly-bars__fill weekly-bars__fill--${day.status}`}
                    style={{ height: `${Math.max(day.progress, 18)}%` }}
                  />
                </div>
                <span className="weekly-bars__label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="weekly-empty">
          <p>{progress.message}</p>
          <div className="weekly-skeleton" aria-label="Inactive weekly progress preview">
            {progress.days.map((day, index) => (
              <span key={`${day}-${index}`}>
                <i aria-hidden="true" />
                {day}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
