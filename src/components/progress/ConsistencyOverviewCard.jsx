import { FlameIcon, ProgressIcon, TargetIcon } from "../icons.jsx";

const overviewItems = [
  { label: "Streak", icon: FlameIcon },
  { label: "Completion", icon: TargetIcon },
  { label: "Feedback", icon: ProgressIcon }
];

export function ConsistencyOverviewCard({ consistency }) {
  return (
    <section className="card progress-card consistency-card" aria-labelledby="consistency-title">
      <p className="card-eyebrow card-eyebrow--red">Overview</p>
      <h2 id="consistency-title">{consistency.title}</h2>
      <p>{consistency.message}</p>

      <div className="consistency-placeholders" aria-hidden="true">
        {overviewItems.map((item) => {
          const Icon = item.icon;

          return (
            <div className="consistency-placeholder" key={item.label}>
              <Icon />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
