import { FeedbackIcon } from "../icons.jsx";

export function TeacherAssignmentCard({ teacher }) {
  return (
    <section className="card profile-card teacher-assignment-card" aria-labelledby="teacher-assignment-title">
      <div className="profile-card-icon" aria-hidden="true">
        <FeedbackIcon />
      </div>
      <div>
        <h2 id="teacher-assignment-title">{teacher.title}</h2>
        <p>{teacher.message}</p>
        <div className="profile-field-list">
          {teacher.futureFields.map((field) => (
            <div className="profile-field-row" key={field}>
              <span>{field}</span>
              <b>Not assigned</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
