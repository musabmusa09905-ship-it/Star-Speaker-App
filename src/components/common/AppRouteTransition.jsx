import "./AppRouteTransition.css";

export function AppRouteTransition({ isVisible, label = "Loading your space..." }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="student-route-transition" role="status" aria-live="polite">
      <div className="student-route-transition__panel">
        <img
          className="student-route-transition__icon"
          src="/app-icon.png"
          alt="Heart of English app icon"
          decoding="async"
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
