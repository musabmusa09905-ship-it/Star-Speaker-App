import { FeedbackIcon } from "./icons.jsx";

export function TeacherFocusCard({ focus }) {
  return (
    <section className="card teacher-card" aria-labelledby="teacher-focus-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">{focus.eyebrow}</p>
        <h2 id="teacher-focus-title">{focus.title}</h2>
        <p>{focus.text}</p>
      </div>
      <div className="teacher-card__icon" aria-hidden="true">
        <FeedbackIcon />
      </div>
    </section>
  );
}
