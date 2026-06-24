import { ClockIcon, LevelIcon, MicIcon } from "./icons.jsx";
import { formatLevelForStudent } from "../lib/heartOfEnglishLevels.js";

export function TodayTaskCard({ task }) {
  const hasAssignedTask = task.hasAssignedTask;

  return (
    <section className="card task-card" aria-labelledby="task-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">{task.label}</p>
        <h2 id="task-title">{task.title}</h2>
      </div>

      {hasAssignedTask && (
        <div className="task-card__meta" aria-label="Task details">
          <span>
            <ClockIcon />
            {task.time}
          </span>
          <span>
            <LevelIcon />
            {formatLevelForStudent(task.level)}
          </span>
        </div>
      )}

      <p className="task-card__description">{task.description}</p>

      <div className="task-card__footer">
        <div className="task-card__mic" aria-hidden="true">
          <MicIcon />
        </div>
        {hasAssignedTask ? (
          <a className="primary-button" href={task.href || "#record"}>
            {task.cta}
          </a>
        ) : (
          <button className="secondary-button" type="button" disabled>
            {task.cta}
          </button>
        )}
      </div>
    </section>
  );
}
