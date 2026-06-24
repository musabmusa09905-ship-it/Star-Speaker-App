import { TargetIcon } from "../icons.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function LearningGoalCard({ goal }) {
  return (
    <section className="card profile-card learning-goal-card mascot-card mascot-card--compact" aria-labelledby="learning-goal-title">
      <div>
        <div className="profile-card-icon" aria-hidden="true">
          <TargetIcon />
        </div>
        <h2 id="learning-goal-title">{goal.title}</h2>
        {goal.value ? <strong className="profile-card-value">{goal.value}</strong> : null}
        <p>{goal.message}</p>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type={goal.value ? "encouragement" : "thinking"}
          size="small"
          motion={goal.value ? "idle" : "thinking"}
          label={goal.value ? "Encouragement mascot for learning goal" : "Thinking mascot for missing learning goal"}
        />
      </div>
    </section>
  );
}
