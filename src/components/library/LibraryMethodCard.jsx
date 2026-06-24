import { IconByName } from "../icons.jsx";

export function LibraryMethodCard({ method }) {
  return (
    <section className="card library-method-card" aria-labelledby="library-method-title">
      <div className="library-section-heading">
        <p className="card-eyebrow card-eyebrow--red">Active learning</p>
        <h2 id="library-method-title">{method.title}</h2>
      </div>
      <p>{method.text}</p>

      <div className="library-method-steps">
        {method.steps.map((step, index) => (
          <article className="library-method-step" key={step.title}>
            <span>{index + 1}</span>
            <IconByName name={step.icon} />
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
