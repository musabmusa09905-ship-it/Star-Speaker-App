import { EmptyStateCard } from "./EmptyStateCard.jsx";
import { PracticeTaskCard } from "./PracticeTaskCard.jsx";

export function TodayPracticeSection({ practice, activeFilter, filters = [], onFilterChange }) {
  return (
    <section className="today-practice" aria-labelledby="today-practice-title">
      <div className="practice-section-header">
        <p className="card-eyebrow card-eyebrow--red">Today</p>
        <h2 id="today-practice-title">{practice.sectionTitle || "Today's Practice"}</h2>
      </div>

      {filters.length > 0 && (
        <div className="practice-filter-bar" aria-label="Practice task filters">
          {filters.map((filter) => (
            <button
              type="button"
              className={activeFilter === filter.key ? "is-active" : ""}
              onClick={() => onFilterChange(filter.key)}
              key={filter.key}
            >
              {filter.label} <span>{filter.count}</span>
            </button>
          ))}
        </div>
      )}

      {practice.hasAssignedTasks ? (
        <div className="practice-task-list">
          {practice.tasks.map((task) => (
            <PracticeTaskCard task={task} key={task.id} />
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title={practice.title}
          message={practice.message}
          cta={practice.cta}
        />
      )}
    </section>
  );
}
