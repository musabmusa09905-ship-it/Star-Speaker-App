import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { TargetIcon } from "../icons.jsx";
import { getAssignedStudentsForTeacher } from "../../lib/teacherAssignments.js";
import { createWeeklyFocusForTeacher } from "../../lib/weeklyFocus.js";

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialForm(studentId = "") {
  return {
    student_id: studentId,
    week_start: toDateInputValue(),
    focus_title: "",
    focus_note: "",
    target_description: "",
    active: true
  };
}

function TeacherWeeklyFocusState({ title, message, action }) {
  return (
    <section className="card teacher-weekly-focus-state" aria-labelledby="teacher-weekly-focus-state-title">
      <div className="teacher-weekly-focus-state__icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Weekly focus</p>
        <h2 id="teacher-weekly-focus-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function StudentSelector({ students, selectedStudentId, disabled, onSelect }) {
  return (
    <section className="card teacher-weekly-focus-card" aria-labelledby="weekly-focus-student-title">
      <div className="teacher-weekly-focus-card__header">
        <p className="card-eyebrow card-eyebrow--red">Student</p>
        <h2 id="weekly-focus-student-title">Choose an assigned student</h2>
      </div>

      <div className="teacher-student-picker">
        {students.map((student) => {
          const isSelected = student.id === selectedStudentId;

          return (
            <button
              type="button"
              className={isSelected ? "is-selected" : ""}
              disabled={disabled}
              onClick={() => onSelect(student.id)}
              aria-pressed={isSelected}
              key={student.id}
            >
              <span>{student.full_name || "Student"}</span>
              <small>{student.email || "No email"}</small>
              <em>
                {student.learningProfile?.level || "Level not set"}
                {student.learningProfile?.main_goal ? ` - ${student.learningProfile.main_goal}` : ""}
              </em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SubmitStatus({ status, onSetAnother }) {
  if (!status.message) {
    return null;
  }

  return (
    <div className={`teacher-assign-message teacher-assign-message--${status.type}`}>
      <p>{status.message}</p>
      {status.detail && <span>{status.detail}</span>}
      {status.type === "success" && (
        <div className="teacher-assign-message__actions">
          <button className="secondary-button" type="button" onClick={onSetAnother}>
            Set another focus
          </button>
          <a className="primary-button" href="/teacher/tasks">View Teacher Tasks</a>
        </div>
      )}
    </div>
  );
}

export function TeacherWeeklyFocusPage({ user, profile }) {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(createInitialForm());
  const [submitStatus, setSubmitStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const isSubmitting = submitStatus.type === "submitting";
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === form.student_id) || null,
    [form.student_id, students]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStudents([]);
      setLoadError("");

      if (profile?.role !== "teacher") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getAssignedStudentsForTeacher(profile.id);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setLoadError(result.error);
        return;
      }

      setStudents(result.students);
      setForm((current) => ({
        ...current,
        student_id: current.student_id || result.students[0]?.id || ""
      }));
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  function updateField(field, value) {
    setSubmitStatus({ type: "idle", message: "", detail: "" });
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setForm(createInitialForm(form.student_id));
    setSubmitStatus({ type: "idle", message: "", detail: "" });
  }

  function validateForm() {
    if (!form.student_id) {
      return "Choose a student.";
    }

    if (!students.some((student) => student.id === form.student_id)) {
      return "You can only set weekly focus for your assigned students.";
    }

    if (!form.week_start || Number.isNaN(new Date(`${form.week_start}T00:00:00`).getTime())) {
      return "Choose a valid week start date.";
    }

    if (!form.focus_title.trim()) {
      return "Focus title is required.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setSubmitStatus({
        type: "error",
        message: validationError,
        detail: ""
      });
      return;
    }

    setSubmitStatus({
      type: "submitting",
      message: "Saving weekly focus...",
      detail: ""
    });

    const result = await createWeeklyFocusForTeacher({
      teacherId: profile.id,
      values: form
    });

    if (result.error) {
      setSubmitStatus({
        type: "error",
        message: "Could not save weekly focus. Please try again.",
        detail: result.error
      });
      return;
    }

    setSubmitStatus({
      type: "success",
      message: "Weekly focus saved successfully.",
      detail: selectedStudent
        ? `${result.weeklyFocus.focusTitle} was set for ${selectedStudent.full_name || "Student"}.`
        : result.weeklyFocus.focusTitle
    });
    setForm(createInitialForm(form.student_id));
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-weekly-focus-page">
        <Header user={user} title="Weekly Focus" subtitle="Set focused speaking goals for the week." />
        <TeacherWeeklyFocusState
          title="Weekly focus is only available for teacher accounts."
          message="Students can view their teacher's weekly focus on Home, Profile, and Progress."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="teacher-weekly-focus-page">
        <Header user={user} title="Weekly Focus" subtitle="Set focused speaking goals for the week." />
        <TeacherWeeklyFocusState
          title="Admin weekly focus tools will be added later."
          message="For now, sign in as a teacher to set weekly focus for assigned students."
        />
      </div>
    );
  }

  return (
    <div className="teacher-weekly-focus-page">
      <Header user={user} title="Weekly Focus" subtitle="Set focused speaking goals for the week." />

      {isLoading ? (
        <TeacherWeeklyFocusState
          title="Loading assigned students..."
          message="Please wait while we open your student list."
        />
      ) : loadError ? (
        <TeacherWeeklyFocusState
          title="Could not load assigned students."
          message={loadError}
        />
      ) : !students.length ? (
        <TeacherWeeklyFocusState
          title="No students assigned yet."
          message="Once students are linked to your teacher account, you can set weekly focus here."
        />
      ) : (
        <form className="teacher-weekly-focus-form" onSubmit={handleSubmit}>
          <StudentSelector
            students={students}
            selectedStudentId={form.student_id}
            disabled={isSubmitting}
            onSelect={(studentId) => updateField("student_id", studentId)}
          />

          <section className="card teacher-weekly-focus-card" aria-labelledby="weekly-focus-details-title">
            <div className="teacher-weekly-focus-card__header">
              <p className="card-eyebrow card-eyebrow--red">Focus details</p>
              <h2 id="weekly-focus-details-title">Create this week's focus</h2>
            </div>

            <div className="teacher-task-form-grid">
              <label>
                Week start
                <input
                  type="date"
                  value={form.week_start}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("week_start", event.target.value)}
                  required
                />
              </label>
              <label>
                Focus title
                <input
                  type="text"
                  value={form.focus_title}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("focus_title", event.target.value)}
                  placeholder="Fluency and linking ideas"
                  required
                />
              </label>
              <label>
                Focus note
                <textarea
                  rows="4"
                  value={form.focus_note}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("focus_note", event.target.value)}
                  placeholder="This week, focus on connecting ideas naturally and reducing long pauses."
                />
              </label>
              <label>
                Target description
                <textarea
                  rows="4"
                  value={form.target_description}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("target_description", event.target.value)}
                  placeholder="Use at least three linking phrases in your speaking tasks."
                />
              </label>
            </div>

            <label className="teacher-weekly-focus-toggle">
              <input
                type="checkbox"
                checked={form.active}
                disabled={isSubmitting}
                onChange={(event) => updateField("active", event.target.checked)}
              />
              <span>Make this focus active for the student</span>
            </label>
          </section>

          <section className="teacher-assign-submit">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving focus..." : "Set Weekly Focus"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={isSubmitting}
              onClick={resetForm}
            >
              Reset
            </button>
          </section>

          <SubmitStatus status={submitStatus} onSetAnother={resetForm} />
        </form>
      )}
    </div>
  );
}
