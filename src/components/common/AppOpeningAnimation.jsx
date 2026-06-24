import { useEffect, useState } from "react";

const OPENING_SEEN_KEY = "heartOpeningSeen";
const OPENING_DURATION_MS = 1700;
const REDUCED_MOTION_DURATION_MS = 420;
const APP_ICON_SRC = "/assets/star-speaker/android-chrome-192x192.png";

function hasSeenOpening() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.sessionStorage.getItem(OPENING_SEEN_KEY) === "true";
  } catch {
    return true;
  }
}

function markOpeningSeen() {
  try {
    window.sessionStorage.setItem(OPENING_SEEN_KEY, "true");
  } catch {
    // The animation should never block the app if sessionStorage is unavailable.
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AppOpeningAnimation({ enabled = true }) {
  const [isVisible, setIsVisible] = useState(() => enabled && !hasSeenOpening());
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (!enabled || !isVisible) {
      return undefined;
    }

    const reducedMotion = prefersReducedMotion();
    setIsReducedMotion(reducedMotion);

    const timer = window.setTimeout(
      () => {
        markOpeningSeen();
        setIsVisible(false);
      },
      reducedMotion ? REDUCED_MOTION_DURATION_MS : OPENING_DURATION_MS
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, isVisible]);

  if (!enabled || !isVisible) {
    return null;
  }

  return (
    <div
      className={`app-opening-animation ${isReducedMotion ? "is-reduced-motion" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Star Speaker"
    >
      <div className="app-opening-animation__lines" aria-hidden="true">
        <span className="app-opening-animation__line app-opening-animation__line--one" />
        <span className="app-opening-animation__line app-opening-animation__line--two" />
        <span className="app-opening-animation__line app-opening-animation__line--three" />
        <span className="app-opening-animation__dot app-opening-animation__dot--one" />
        <span className="app-opening-animation__dot app-opening-animation__dot--two" />
        <span className="app-opening-animation__dot app-opening-animation__dot--three" />
      </div>

      <div className="app-opening-animation__content">
        <div className="app-opening-animation__icon-shell" aria-hidden="true">
          <img
            className="app-opening-animation__icon"
            src={APP_ICON_SRC}
            alt=""
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.opacity = "0";
            }}
          />
        </div>
        <div className="app-opening-animation__copy">
          <h1>Welcome back</h1>
          <p>Loading your speaking practice...</p>
        </div>
        <div className="app-opening-animation__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
