import { StarIcon } from "../icons.jsx";

export function SelfReflectionCard({
  reflection,
  rating = 0,
  note = "",
  disabled = false,
  onRatingChange,
  onNoteChange
}) {
  return (
    <section className="card self-reflection-card" aria-labelledby="reflection-title">
      <div>
        <h2 id="reflection-title">{reflection.title}</h2>
        <p>{reflection.question}</p>
      </div>

      <div className="confidence-rating" aria-label="Confidence rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            className={value <= rating ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onRatingChange?.(value)}
            aria-label={`Set confidence rating to ${value}`}
            aria-pressed={value <= rating}
            key={value}
          >
            <StarIcon />
          </button>
        ))}
      </div>

      <textarea
        rows="3"
        placeholder={reflection.placeholder}
        aria-label="Reflection note"
        value={note}
        disabled={disabled}
        onChange={(event) => onNoteChange?.(event.target.value)}
      />
    </section>
  );
}
