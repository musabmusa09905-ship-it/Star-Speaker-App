import { useEffect, useState } from "react";
import { Header } from "../Header.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";

const PREVIEW_ITEMS = [
  {
    type: "welcome",
    title: "Welcome",
    use: "Onboarding, first visits, and gentle empty states.",
    behavior: "Gentle float, soft tilt, and a small heart bubble for safe first impressions."
  },
  {
    type: "explaining",
    title: "Explaining",
    use: "Speaking tasks, recording prompts, library help, and practice instructions.",
    behavior: "Light bounce with a pulsing speech bubble to make guidance feel approachable."
  },
  {
    type: "celebration",
    title: "Celebration",
    use: "Task completion and successful habit moments.",
    behavior: "One-time pop with restrained confetti, unless looping is explicitly requested."
  },
  {
    type: "thinking",
    title: "Thinking",
    use: "Reflection, waiting states, and thoughtful prompts.",
    behavior: "Slow floating motion with a calm thought bubble for reflective moments."
  },
  {
    type: "encouragement",
    title: "Encouragement",
    use: "Reminders, confidence support, and gentle motivation.",
    behavior: "Supportive pulse with a subtle heart glow, designed to feel warm rather than urgent."
  },
  {
    type: "progress",
    title: "Progress",
    use: "Streaks, consistency board, and progress pages.",
    behavior: "Proud bounce with progress bars and a small rising arrow for visible momentum."
  }
];

export function MascotPreviewPage({ user, profile }) {
  const [selectedMascot, setSelectedMascot] = useState(null);

  useEffect(() => {
    if (!selectedMascot) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedMascot(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedMascot]);

  if (profile?.role !== "admin") {
    return (
      <main className="mascot-preview-page">
        <Header
          user={user}
          title="Mascot Preview"
          subtitle="This asset preview is only available for admin accounts."
        />

        <section className="empty-state-card">
          <h2>Admin preview only</h2>
          <p>Students and teachers can use the app normally. Mascot asset review stays in admin tools.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mascot-preview-page">
      <Header
        user={user}
        title="Mascot Preview"
        subtitle="Review the Star Speaker guide poses and their production-ready animation styles."
      />

      <section className="mascot-preview-intro">
        <div>
          <p className="section-kicker">Brand animation system</p>
          <h2>Warm, focused motion without overbuilding</h2>
          <p>
            These PNG mascots use CSS-only movement, stable image sizing, and reduced-motion support.
            The goal is encouragement, not distraction.
          </p>
        </div>
      </section>

      <section className="mascot-preview-grid" aria-label="Mascot animation examples">
        {PREVIEW_ITEMS.map((item) => (
          <button
            className="mascot-preview-card"
            type="button"
            onClick={() => setSelectedMascot(item)}
            key={item.type}
          >
            <MascotAnimation type={item.type} size="medium" />
            <div>
              <h2>{item.title}</h2>
              <p>{item.use}</p>
              <span>Click to preview</span>
            </div>
          </button>
        ))}
      </section>

      {selectedMascot && (
        <div
          className="mascot-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedMascot(null);
            }
          }}
        >
          <section
            className="mascot-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mascot-modal-title"
          >
            <button
              className="mascot-modal__close"
              type="button"
              onClick={() => setSelectedMascot(null)}
              aria-label="Close mascot preview"
            >
              Close
            </button>

            <div className="mascot-modal__visual">
              <MascotAnimation
                type={selectedMascot.type}
                size="hero"
                loop={selectedMascot.type === "celebration" ? true : undefined}
              />
            </div>

            <div className="mascot-modal__content">
              <p className="section-kicker">Large preview</p>
              <h2 id="mascot-modal-title">{selectedMascot.title}</h2>
              <p>{selectedMascot.use}</p>
              <div>
                <strong>Behavior</strong>
                <span>{selectedMascot.behavior}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
