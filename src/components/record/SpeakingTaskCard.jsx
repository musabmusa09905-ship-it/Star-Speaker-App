import { IconByName, TargetIcon } from "../icons.jsx";
import { buildTaskClarity } from "../../lib/taskClarity.js";
import { MinimumPracticeDetails } from "../common/MinimumPracticeDetails.jsx";

export function SpeakingTaskCard({ task, starterPhrases = [] }) {
  const clarity = buildTaskClarity(task);
  const canUseMinimumPractice = !task.status || ["assigned", "in_progress"].includes(task.status);
  const visibleStarterPhrases = starterPhrases.filter(Boolean).slice(0, 3);

  return (
    <section className="card speaking-task-card" aria-labelledby="speaking-task-title">
      <div className="speaking-task-card__copy">
        <div className="speaking-task-card__eyebrow-row">
          <p className="card-eyebrow card-eyebrow--red">{task.label}</p>
          {task.status && <span>{task.status}</span>}
        </div>
        <h2 id="speaking-task-title">{task.title}</h2>
        <div className="task-clarity-block">
          <p className="task-clarity-block__label">Your Mission</p>
          <p>{clarity.mission}</p>
        </div>
      </div>

      <div className="speaking-task-card__visual" aria-hidden="true">
        <TargetIcon />
      </div>

      {visibleStarterPhrases.length > 0 && (
        <div className="speaking-task-card__starter-phrases" aria-label="Starter phrases">
          <strong>Starter phrases</strong>
          <div>
            {visibleStarterPhrases.map((phrase) => (
              <span key={phrase}>{phrase}</span>
            ))}
          </div>
        </div>
      )}

      <details className="speaking-task-card__details" aria-label="Task details">
        <summary>Task details</summary>
        <div className="speaking-task-card__details-list">
          {task.details.map((detail) => (
            <div className="speaking-task-detail" key={detail.label}>
              <IconByName name={detail.icon} />
              <span>{detail.label}</span>
            </div>
          ))}
        </div>
      </details>

      <div className="task-finish-line" aria-labelledby="record-finish-line-title">
        <strong id="record-finish-line-title">Finish Line</strong>
        <ul>
          {clarity.finishLine.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {canUseMinimumPractice && <MinimumPracticeDetails task={task} />}
    </section>
  );
}
