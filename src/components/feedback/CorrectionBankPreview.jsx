import { BookIcon } from "../icons.jsx";

export function CorrectionBankPreview({ bank }) {
  return (
    <section
      className="card feedback-small-card feedback-correction-bank"
      aria-labelledby="correction-bank-title"
    >
      <div className="feedback-card-icon" aria-hidden="true">
        <BookIcon />
      </div>
      <div>
        <h2 id="correction-bank-title">{bank.title}</h2>
        <p>{bank.message}</p>
      </div>
    </section>
  );
}
