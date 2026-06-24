import { buildTaskClarity } from "../../lib/taskClarity.js";

export function MinimumPracticeDetails({ task, compact = false }) {
  const { minimumPractice } = buildTaskClarity(task);

  if (!minimumPractice) {
    return null;
  }

  return (
    <details className={compact ? "minimum-practice-details minimum-practice-details--compact" : "minimum-practice-details"}>
      <summary>
        <span>{minimumPractice.title}</span>
        <small>Minimum useful practice</small>
      </summary>
      <div className="minimum-practice-details__body">
        <p>{minimumPractice.intro}</p>
        <ul>
          {minimumPractice.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <p className="minimum-practice-details__note">{minimumPractice.note}</p>
      </div>
    </details>
  );
}
