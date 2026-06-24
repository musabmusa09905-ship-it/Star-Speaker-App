import { SendIcon } from "../icons.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { useState } from "react";

export function SubmitRecordingCard({
  submit,
  hasRecording = false,
  isSubmitting = false,
  isSubmitted = false,
  message = "",
  detail = "",
  onSubmit
}) {
  const [notice, setNotice] = useState("");

  function handleSubmitClick() {
    if (!hasRecording) {
      setNotice("Record your answer first.");
      return;
    }

    setNotice("");
    onSubmit?.();
  }

  const buttonLabel = isSubmitting
    ? "Uploading your recording..."
    : isSubmitted
      ? "Submitted"
      : submit.cta;
  const helperMessage =
    message ||
    (hasRecording
      ? "Listen once. If your message is clear enough, submit it."
      : submit.message);
  const note = notice || detail;
  const noteClassName = detail
    ? "submit-recording-note submit-recording-note--error"
    : "submit-recording-note";

  return (
    <section
      className={`submit-recording-card ${isSubmitted ? "submit-recording-card--success" : ""}`}
      aria-labelledby="submit-recording-title"
    >
      {isSubmitted && (
        <div className="submit-recording-card__mascot">
          <MascotAnimation
            type="celebration"
            size="small"
            motion="celebrate"
            loop={false}
            label="Celebration mascot for submitted recording"
          />
        </div>
      )}
      <button
        className="submit-recording-button"
        type="button"
        disabled={!hasRecording || isSubmitting || isSubmitted}
        onClick={handleSubmitClick}
      >
        <span id="submit-recording-title">{buttonLabel}</span>
        <SendIcon />
      </button>
      <p>{helperMessage}</p>
      {note && <p className={noteClassName}>{note}</p>}
      {isSubmitted ? (
        <div className="submit-recording-next-actions" aria-label="Next steps after submitting">
          <a className="submit-recording-back-button" href="/feedback">
            View Feedback
          </a>
          <a href="/">
            Back to Home
          </a>
          <a href="/progress">
            View Progress
          </a>
        </div>
      ) : null}
    </section>
  );
}
