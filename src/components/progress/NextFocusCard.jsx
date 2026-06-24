import { TargetIcon } from "../icons.jsx";

export function NextFocusCard({ focus }) {
  return (
    <section className="card progress-card progress-next-focus" aria-labelledby="progress-next-focus-title">
      <div className="progress-card-icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <h2 id="progress-next-focus-title">{focus.title}</h2>
        <p>{focus.message}</p>
      </div>
    </section>
  );
}
