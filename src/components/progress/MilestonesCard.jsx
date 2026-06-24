import { LockIcon } from "../icons.jsx";

export function MilestonesCard({ milestones }) {
  return (
    <section className="card progress-card milestones-card" aria-labelledby="milestones-title">
      <p className="card-eyebrow card-eyebrow--red">Habit markers</p>
      <h2 id="milestones-title">{milestones.title}</h2>

      <div className="milestone-list">
        {milestones.items.map((item) => (
          <article className="milestone-item" key={item}>
            <span className="milestone-item__icon" aria-hidden="true">
              <LockIcon />
            </span>
            <span>{item}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
