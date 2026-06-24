export function GuidingPhrasesCard({ phrases }) {
  const hasPhrases = phrases.length > 0;

  return (
    <section className="card guiding-phrases-card" aria-labelledby="phrases-title">
      <p className="card-eyebrow card-eyebrow--red">Need Help?</p>
      <h2 id="phrases-title">Useful phrases</h2>
      <p>
        {hasPhrases
          ? "Use 2-3 phrases only if they help. You do not need to read everything."
          : "No extra phrase support for this task. Think for 10 seconds, then speak naturally."}
      </p>
      {hasPhrases && (
        <div className="phrase-chip-list">
          {phrases.map((phrase) => (
            <span key={phrase}>{phrase}</span>
          ))}
        </div>
      )}
    </section>
  );
}
