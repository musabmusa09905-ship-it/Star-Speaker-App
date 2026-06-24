export function ProgressSkeleton({ days }) {
  return (
    <div className="progress-week-skeleton" aria-label="Inactive weekly progress preview">
      {days.map((day, index) => (
        <span key={`${day}-${index}`}>
          <i aria-hidden="true" />
          <b>{day}</b>
        </span>
      ))}
    </div>
  );
}
