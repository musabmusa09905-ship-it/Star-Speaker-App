import { MicIcon } from "../icons.jsx";

export function BeforeAfterPreviewCard({ beforeAfter }) {
  return (
    <section className="card progress-card before-after-card" aria-labelledby="before-after-title">
      <div className="before-after-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Voice progress</p>
          <h2 id="before-after-title">{beforeAfter.title}</h2>
        </div>
        <div className="progress-card-icon" aria-hidden="true">
          <MicIcon />
        </div>
      </div>

      <p>{beforeAfter.message}</p>

      <div className="voice-preview-pair" aria-hidden="true">
        <div>
          <span>First recording</span>
          <i />
        </div>
        <div>
          <span>Latest recording</span>
          <i />
        </div>
      </div>
    </section>
  );
}
