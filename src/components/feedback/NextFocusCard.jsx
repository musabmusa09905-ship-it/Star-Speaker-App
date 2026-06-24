import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function NextFocusCard({ focus }) {
  return (
    <section className="card feedback-small-card feedback-next-focus mascot-card mascot-card--compact" aria-labelledby="next-focus-title">
      <div className="mascot-card-content">
        <h2 id="next-focus-title">{focus.title}</h2>
        <p>{focus.message}</p>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type="progress"
          size="small"
          motion="progress"
          label="Progress mascot for next speaking focus"
        />
      </div>
    </section>
  );
}
