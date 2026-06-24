import { IconByName } from "../icons.jsx";

export function FeedbackMethodCard({ method }) {
  return (
    <section className="card feedback-method-card" aria-labelledby="feedback-method-title">
      <div className="feedback-method-card__intro">
        <p className="card-eyebrow card-eyebrow--red">Learning loop</p>
        <h2 id="feedback-method-title">{method.title}</h2>
        <p>{method.text}</p>
      </div>

      <div className="feedback-method-items">
        {method.items.map((item) => (
          <article className="feedback-method-item" key={item.title}>
            <IconByName name={item.icon} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
