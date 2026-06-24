import { FeedbackIcon } from "../icons.jsx";

export function TeacherAssignmentNotice({ notice }) {
  return (
    <section className="card teacher-notice" aria-labelledby="teacher-notice-title">
      <div className="teacher-notice__icon" aria-hidden="true">
        <FeedbackIcon />
      </div>
      <div>
        <h2 id="teacher-notice-title">{notice.title}</h2>
        <p>{notice.message}</p>
      </div>
    </section>
  );
}
