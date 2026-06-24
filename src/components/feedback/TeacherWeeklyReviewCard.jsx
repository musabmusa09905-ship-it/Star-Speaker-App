import { MascotAnimation } from "../common/MascotAnimation.jsx";

export function TeacherWeeklyReviewCard({ review }) {
  return (
    <section className="card feedback-review-card mascot-card mascot-card--compact" aria-labelledby="weekly-review-title">
      <div className="mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Teacher review</p>
        <h2 id="weekly-review-title">{review.title}</h2>
        <p>{review.message}</p>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type="encouragement"
          size="small"
          motion="idle"
          label="Encouragement mascot for teacher feedback"
        />
      </div>
    </section>
  );
}
