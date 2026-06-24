import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { ProgressIcon, TargetIcon } from "../icons.jsx";
import { getDropOffAnalyticsOverview } from "../../lib/dropOffAnalytics.js";
import { isAdminLike } from "../../lib/rolePermissions.js";

const periodFilters = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_7_days", label: "Last 7 days" }
];

const statusFilters = [
  "All",
  "Active",
  "Needs nudge",
  "Slipping",
  "Started no submit",
  "Inactive",
  "Waiting for feedback",
  "Feedback not viewed",
  "No task assigned"
];

function formatDateTime(value) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function percentOfTotal(count, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
}

function formatEventType(value) {
  return (value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function AccessState({ title, message, href = "/profile", cta = "Go to Profile" }) {
  return (
    <div className="dropoff-access-state card">
      <span className="dropoff-access-state__icon">
        <TargetIcon />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
        <a className="secondary-button" href={href}>{cta}</a>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, note }) {
  return (
    <article className="dropoff-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function FunnelStep({ step, total }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleStudents = isExpanded ? step.students : step.students.slice(0, 6);
  const hiddenCount = Math.max(0, step.students.length - visibleStudents.length);

  return (
    <article className="dropoff-funnel-step">
      <div className="dropoff-funnel-step__top">
        <span>{step.label}</span>
        <strong>{step.count}</strong>
      </div>
      <p>{step.description}</p>
      <p>{percentOfTotal(step.count, total)} of visible students</p>
      <div className="dropoff-funnel-bar" aria-hidden="true">
        <i style={{ width: percentOfTotal(step.count, total) }} />
      </div>
      <div className="dropoff-funnel-names">
        {visibleStudents.length ? (
          visibleStudents.map((student) => (
            <span key={student.studentId} title={student.reminderInsight}>
              {student.studentName}
            </span>
          ))
        ) : (
          <em>No students in this stage.</em>
        )}
      </div>
      {hiddenCount > 0 || isExpanded ? (
        <button
          type="button"
          className="dropoff-inline-button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      ) : null}
    </article>
  );
}

function StatusBadge({ status }) {
  const className = `dropoff-status-badge dropoff-status-badge--${status
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  return <span className={className}>{status}</span>;
}

function StudentRow({ student }) {
  return (
    <details className="dropoff-student-row">
      <summary className="dropoff-student-row__main">
        <div className="dropoff-student-name">
          <strong>{student.studentName}</strong>
          <span>{student.latestTaskTitle}</span>
        </div>
        <StatusBadge status={student.riskStatus} />
        <span>
          <small>Last open</small>
          {formatDateTime(student.lastAppOpenAt)}
        </span>
        <span>
          <small>Last submit</small>
          {formatDateTime(student.lastSubmittedAt)}
        </span>
        <span>
          <small>Tasks</small>
          {student.counts.tasks}
        </span>
        <span>
          <small>Reminder insight</small>
          {student.reminderInsight}
        </span>
      </summary>
      <div className="dropoff-detail-grid">
        <div>
          <span>Latest task status</span>
          <strong>{student.latestTaskStatus || "Not started"}</strong>
        </div>
        <div>
          <span>Task viewed</span>
          <strong>{student.taskViewed ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Recording started</span>
          <strong>{student.recordingStarted ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong>{student.periodSubmitted ? "Yes in period" : student.submitted ? "Earlier" : "No"}</strong>
        </div>
        <div>
          <span>Feedback ready</span>
          <strong>{student.feedbackReady ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Feedback viewed</span>
          <strong>{student.feedbackViewed ? "Yes" : "No"}</strong>
        </div>
      </div>
      <div className="dropoff-event-strip">
        <h3>Recent tracked events</h3>
        {student.recentEvents?.length ? (
          <ul>
            {student.recentEvents.map((event) => (
              <li key={event.id}>
                <span>{formatEventType(event.type)}</span>
                <time>{formatDateTime(event.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p>No tracked events yet.</p>
        )}
      </div>
    </details>
  );
}

export function DropOffAnalyticsPage({ user, profile }) {
  const [period, setPeriod] = useState("this_week");
  const [statusFilter, setStatusFilter] = useState("All");
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const canViewAnalytics = profile?.role === "teacher" || isAdminLike(profile);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      if (!canViewAnalytics) {
        setOverview(null);
        setError("");
        return;
      }

      setIsLoading(true);
      setError("");

      const result = await getDropOffAnalyticsOverview({ profile, period });

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setOverview(null);
        setError(result.error);
        return;
      }

      setOverview(result.overview);
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [canViewAnalytics, period, profile]);

  const visibleStudents = useMemo(() => {
    const students = overview?.students || [];

    if (statusFilter === "All") {
      return students;
    }

    return students.filter((student) => student.riskStatus === statusFilter);
  }, [overview?.students, statusFilter]);
  const filterOptions = overview?.statusOptions || statusFilters;

  if (profile?.role === "student") {
    return (
      <div className="dropoff-analytics-page">
        <Header user={user} title="Drop-Off Analytics" subtitle="Staff analytics are not shown to student accounts." />
        <AccessState
          title="Drop-off analytics is only available for teacher and admin accounts."
          message="Your student pages stay focused on practice, feedback, and progress."
          href="/"
          cta="Go Home"
        />
      </div>
    );
  }

  if (!canViewAnalytics) {
    return (
      <div className="dropoff-analytics-page">
        <Header user={user} title="Drop-Off Analytics" subtitle="Analytics access is role protected." />
        <AccessState
          title="This analytics view is not available for your account."
          message="Use your profile page while your account permissions are checked."
        />
      </div>
    );
  }

  return (
    <div className="dropoff-analytics-page">
      <Header
        user={user}
        title="Drop-Off Analytics"
        subtitle="See where students need a gentle nudge across the speaking habit loop."
      />

      <section className="card dropoff-control-card">
        <div>
          <p className="card-eyebrow card-eyebrow--red">First controlled version</p>
          <h2>Student habit funnel</h2>
          <p>Tracked events are limited to safe activity signals. They do not expose feedback text or teacher scores.</p>
        </div>
        <div className="dropoff-filter-row" aria-label="Period filter">
          {periodFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={period === item.value ? "active" : ""}
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && <AccessState title="Loading drop-off analytics..." message="Checking real student activity events." cta="" />}

      {error && !isLoading && (
        <AccessState
          title="Could not load drop-off analytics."
          message={error}
          href="/profile"
          cta="Go to Profile"
        />
      )}

      {overview && !isLoading && !error && (
        <>
          <section className="dropoff-summary-grid" aria-label="Analytics summary">
            <SummaryCard label="Visible students" value={overview.summary.totalStudents} note="Based on your role access." />
            <SummaryCard label="Active" value={overview.summary.active} note="No immediate nudge needed." />
            <SummaryCard label="Needs attention" value={overview.summary.needsAttention} note="Needs nudge, slipping, or inactive." />
            <SummaryCard label="Waiting for feedback" value={overview.summary.waitingForFeedback} note="Teacher review is the next step." />
            <SummaryCard label="Started, no submit" value={overview.summary.startedNoSubmit} note="Recording began but no submission followed." />
            <SummaryCard label="No activity" value={overview.summary.noActivity} note="No tracked activity in this period." />
          </section>

          <section className="card dropoff-funnel-card">
            <div className="dropoff-section-heading">
              <div>
                <p className="card-eyebrow card-eyebrow--red">{overview.periodLabel}</p>
                <h2>Drop-Off Funnel</h2>
              </div>
              <span className="dropoff-section-heading__icon">
                <ProgressIcon />
              </span>
            </div>
            <div className="dropoff-funnel-list">
              {overview.funnel.map((step) => (
                <FunnelStep key={step.key} step={step} total={overview.summary.totalStudents} />
              ))}
            </div>
          </section>

          <section className="card dropoff-students-card">
            <div className="dropoff-section-heading">
              <div>
                <p className="card-eyebrow card-eyebrow--red">Reminder insight</p>
                <h2>Student Risk List</h2>
                <p>Labels are designed for support, not punishment.</p>
              </div>
            </div>
            <div className="dropoff-filter-row dropoff-filter-row--wide" aria-label="Status filter">
              {filterOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={statusFilter === status ? "active" : ""}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            {visibleStudents.length ? (
              <div className="dropoff-student-list">
                {visibleStudents.map((student) => (
                  <StudentRow key={student.studentId} student={student} />
                ))}
              </div>
            ) : (
              <div className="dropoff-empty-state">
                <h3>No students match this filter.</h3>
                <p>Try a different status or period filter.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
