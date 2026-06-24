import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { EmptyStateCard } from "./EmptyStateCard.jsx";
import { PracticeTaskCard } from "./PracticeTaskCard.jsx";

function DailyHabitBanner({ habit }) {
  if (!habit) {
    return null;
  }

  return (
    <div className={habit.isComplete ? "practice-daily-banner is-complete" : "practice-daily-banner"}>
      <strong>
        {habit.isComplete
          ? "Completed today. That is how confidence is built."
          : "Complete one speaking task today to protect your habit."}
      </strong>
      <span>
        {habit.isComplete
          ? habit.message
          : "One submitted recording completes the habit. More practice is always welcome."}
      </span>
    </div>
  );
}

function TaskGroup({ title, message, tasks, variant = "standard" }) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <section className={`practice-task-group practice-task-group--${variant}`} aria-label={title}>
      <div className="practice-task-group__header">
        <h3>{title}</h3>
        {message && <p>{message}</p>}
      </div>
      <div className="practice-task-list">
        {tasks.map((task) => (
          <PracticeTaskCard task={task} key={task.id} />
        ))}
      </div>
    </section>
  );
}

function RecoveryNudge({ taskGroups }) {
  const hasOlderActiveTasks = taskGroups.oldActiveCount > 0;

  if (!hasOlderActiveTasks && taskGroups.recoveryTasks.length === 0) {
    return null;
  }

  return (
    <div className="practice-recovery-card">
      <div>
        <p className="card-eyebrow card-eyebrow--red">Recovery option</p>
        <strong>One useful task is enough to move forward today.</strong>
        <span>
          Older practice stays available below, but today&apos;s mission is the first priority.
        </span>
      </div>
      {taskGroups.currentTask?.href && (
        <a className="secondary-button" href={taskGroups.currentTask.href}>
          Continue today
        </a>
      )}
    </div>
  );
}

function OlderTaskHistory({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <details className="practice-history-details">
      <summary>
        <span>Older practice history</span>
        <b>{tasks.length}</b>
      </summary>
      <div className="practice-history-details__body">
        <p>
          These tasks are kept for reference. Start with today&apos;s mission when you want a clean practice path.
        </p>
        <div className="practice-task-list">
          {tasks.map((task) => (
            <PracticeTaskCard task={task} key={task.id} />
          ))}
        </div>
      </div>
    </details>
  );
}

function GroupedPracticeTasks({ practice }) {
  const taskGroups = practice.taskGroups;

  if (!taskGroups) {
    return null;
  }

  return (
    <div className="practice-priority-stack">
      <TaskGroup
        title="Current mission"
        message="Start here. This is the task that matters most right now."
        tasks={taskGroups.currentTask ? [taskGroups.currentTask] : []}
        variant="current"
      />

      <RecoveryNudge taskGroups={taskGroups} />

      <TaskGroup
        title="Recent recovery"
        message="If you want a gentle restart, choose one recent task. No backlog pressure."
        tasks={taskGroups.recoveryTasks}
        variant="recovery"
      />

      <TaskGroup
        title="Waiting for feedback"
        message="These are complete. Your teacher can review them when ready."
        tasks={taskGroups.waitingTasks}
        variant="waiting"
      />

      <TaskGroup
        title="Feedback ready"
        message="Review these notes when you want your next focus."
        tasks={taskGroups.feedbackReadyTasks}
        variant="feedback"
      />

      <OlderTaskHistory tasks={taskGroups.olderTasks} />
    </div>
  );
}

export function TodayPracticeSection({ practice, dailyHabit, activeFilter, filters = [], onFilterChange }) {
  const showGroupedPractice = activeFilter === "all" && practice.taskGroups;

  return (
    <section className="today-practice" aria-labelledby="today-practice-title">
      <div className="practice-section-header">
        <p className="card-eyebrow card-eyebrow--red">Today</p>
        <h2 id="today-practice-title">{practice.sectionTitle || "Today's Practice"}</h2>
      </div>

      <DailyHabitBanner habit={dailyHabit} />

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
        <>
          <div className="practice-mascot-guidance mascot-card mascot-card--compact">
            <div className="mascot-card-content">
              <p className="card-eyebrow card-eyebrow--red">Speaking coach</p>
              <strong>{showGroupedPractice ? "Start with today. Keep the rest light." : "Choose a task, speak clearly, and submit one real attempt."}</strong>
              <span>
                {showGroupedPractice
                  ? "Older practice is still here, but one clear recording today is the main win."
                  : "Every submitted recording strengthens your habit and gives your teacher better context."}
              </span>
            </div>
            <div className="mascot-card-visual">
              <MascotAnimation
                type="explaining"
                size="small"
                motion="idle"
                label="Explaining mascot for speaking practice"
              />
            </div>
          </div>

          {showGroupedPractice ? (
            <GroupedPracticeTasks practice={practice} />
          ) : (
            <div className="practice-task-list">
              {practice.tasks.map((task) => (
                <PracticeTaskCard task={task} key={task.id} />
              ))}
            </div>
          )}
        </>
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
