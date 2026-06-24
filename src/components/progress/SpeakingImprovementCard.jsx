export function SpeakingImprovementCard({ improvement }) {
  return (
    <section className="card progress-card improvement-card" aria-labelledby="improvement-title">
      <p className="card-eyebrow card-eyebrow--red">Teacher-guided growth</p>
      <h2 id="improvement-title">{improvement.title}</h2>
      <p>{improvement.message}</p>

      <div className="improvement-area-list" aria-hidden="true">
        {improvement.areas.map((area) => (
          <div className="improvement-area" key={area}>
            <span>{area}</span>
            <i />
          </div>
        ))}
      </div>
    </section>
  );
}
