import { ArrowRightIcon, FeedbackIcon } from "../icons.jsx";

export function TeacherRecommendationsCard({ recommendations }) {
  return (
    <section className="card library-recommendation-card" aria-labelledby="teacher-recommendations-title">
      <div className="library-card-icon" aria-hidden="true">
        <FeedbackIcon />
      </div>

      <div>
        <p className="card-eyebrow card-eyebrow--red">Recommended by your teacher</p>
        <h2 id="teacher-recommendations-title">{recommendations.title}</h2>
        <p>{recommendations.message}</p>
      </div>

      <a className="primary-button library-recommendation-card__cta" href="/practice">
        <span>{recommendations.cta}</span>
        <ArrowRightIcon />
      </a>
    </section>
  );
}
