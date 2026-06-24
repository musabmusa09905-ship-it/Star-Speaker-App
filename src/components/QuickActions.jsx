import { IconByName } from "./icons.jsx";

export function QuickActions({ actions }) {
  return (
    <section className="quick-actions" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title">Quick Actions</h2>
      <div className="quick-actions__grid">
        {actions.map((action) => (
          <a className="quick-action-card" href={action.href} key={action.label}>
            <IconByName name={action.icon} />
            <span>{action.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
