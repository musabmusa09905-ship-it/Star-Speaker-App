import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function WeeklyPlanPreview({ plan }) {
  return (
    <section className="card weekly-plan-card mascot-card mascot-card--compact" aria-labelledby="weekly-plan-title">
      <div className="mascot-card-content weekly-plan-card__body">
        <p className="card-eyebrow card-eyebrow--red">Upcoming</p>
        <h2 id="weekly-plan-title">{plan.title}</h2>
        <p>{plan.message}</p>

        <div className="weekly-plan-placeholder" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type="thinking"
          size="small"
          motion="thinking"
          label="Thinking mascot for upcoming weekly plan"
        />
      </div>
    </section>
  );
}
