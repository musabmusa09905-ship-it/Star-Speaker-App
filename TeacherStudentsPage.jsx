import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { ArticleIcon, FeedbackIcon, ProfileIcon, TargetIcon } from "../icons.jsx";
import {
  getTeacherStudentsOverview,
  saveStudentLearningProfileForTeacher
} from "../../lib/teacherStudents.js";

const levelOptions = [
  "",
  "Beginner",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper-Intermediate",
  "Advanced"
];

function formatLabel(value) {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getWeekStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function buildInitialForm(student) {
  const learningProfile = student?.learningProfile || {};

  return {
    level: learningProfile.level || "",
    main_goal: learningProfile.main_goal || "",
    speaking_focus: learningProfile.speaking_focus || "",
    pronunciation_focus: learningProfile.pronunciation_focus || "",
    vocabulary_focus: learningProfile.vocabulary_focus || "",
    practice_target: learningProfile.practice_target || "",
    practice_duration_target: learningProfile.practice_duration_target
      ? String(learningProfile.practice_duration_target)
      : "",
    preferred_practice_time: learningProfile.preferred_practice_time || "",
    notes: learningProfile.notes || ""
  };
}

function TeacherStudentsState({ title, message, action }) {
  return (
    <section className="card teacher-students-state" aria-labelledby="teacher-students-state-title">
      <div className="teacher-students-state__icon" aria-hidden="true">
        <ProfileIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Students</p>
        <h2 id="teacher-students-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function TeacherStudentStats({ students }) {
  const weekStart = getWeekStart();
  const reviewedThisWeek = students.filter((student) => {
    if (!student.latestFeedback?.created_at) {
      return false;
    }

    return new Date(student.latestFeedback.created_at) >= weekStart;
  }).length;
  const stats = [
    {
      label: "Assigned students",
      value: students.length,
      icon: <ProfileIcon />
    },
    {
      label: "With active tasks",
      value: students.filter((student) =>
        ["assigned", "in_progress"].includes(student.latestTask?.status)
      ).length,
      icon: <TargetIcon />
    },
    {
      label: "Waiting for review",
      value: students.filter((student) =>
        student.latestSubmission?.status === "submitted" && !student.latestFeedback
      ).length,
      icon: <FeedbackIcon />
    },
    {
      label: "Reviewed this week",
      value: reviewedThisWeek,
      icon: <ArticleIcon />
    }
  ];

  return (
    <section className="teacher-student-stats" aria-label="Teacher student stats">
      {stats.map((stat) => (
        <article className="card teacher-student-stat" key={stat.label}>
          <div aria-hidden="true">{stat.icon}</div>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}

function TeacherStudentCard({ student, isSelected, onEdit }) {
  const learningProfile = student.learningProfile;
  const latestTask = student.latestTask;
  const latestSubmission = student.latestSubmission;
  const latestFeedback = student.latestFeedback;
  const weeklyFocus = student.weeklyFocus;

  return (
    <article className={`card teacher-student-card ${isSelected ? "is-selected" : ""}`}>
      <div className="teacher-student-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">{student.status || "active"}</p>
          <h2>{student.full_name || "Student"}</h2>
          <p>{student.email || "No email"}</p>
        </div>
        <span className="teacher-student-card__avatar" aria-hidden="true">
          {(student.full_name || student.email || "S").charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="teacher-student-meta">
        <span>Level: {learningProfile?.level || "Not set"}</span>
        <span>Goal: {learningProfile?.main_goal || "Not set"}</span>
        <span>Focus: {learningProfile?.speaking_focus || "Not set"}</span>
        <span>Pronunciation: {learningProfile?.pronunciation_focus || "Not set"}</span>
        <span>Vocabulary: {learningProfile?.vocabulary_focus || "Not set"}</span>
        <span>Practice target: {learningProfile?.practice_target || "Not set"}</span>
      </div>

      <div className="teacher-student-snapshot">
        <div>
          <span>Latest task</span>
          <p>{latestTask ? latestTask.title : "No task assigned yet"}</p>
          {latestTask && <small>{formatLabel(latestTask.status)}</small>}
        </div>
        <div>
          <span>Latest submission</span>
          <p>{latestSubmission ? formatLabel(latestSubmission.status) : "No submission yet"}</p>
          {latestSubmission && <small>{formatDateTime(latestSubmission.submitted_at)}</small>}
        </div>
        <div>
          <span>Feedback status</span>
          <p>{latestFeedback ? "Reviewed" : "No recent feedback"}</p>
        </div>
        <div>
          <span>Weekly focus</span>
          <p>{weeklyFocus?.focusTitle || "No active focus"}</p>
        </div>
      </div>

      <div className="teacher-student-actions">
        <a className="secondary-button" href="/teacher/assign">Assign Task</a>
        <a className="secondary-button" href="/teacher/review">Review</a>
        <button className="primary-button" type="button" onClick={() => onEdit(student)}>
          Edit Profile
        </button>
      </div>
    </article>
  );
}

function StudentProfileEditor({ student, teacherId, onSaved, onCancel }) {
  const [form, setForm] = useState(() => buildInitialForm(student));
  const [status, setStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const isSaving = status.type === "saving";

  useEffect(() => {
    setForm(buildInitialForm(student));
    setStatus({
      type: "idle",
      message: "",
      detail: ""
    });
  }, [student]);

  function updateField(field, value) {
    setStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const duration = form.practice_duration_target
      ? Number(form.practice_duration_target)
      : null;

    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
      setStatus({
        type: "error",
        message: "Practice duration target must be a positive number.",
        detail: ""
      });
      return;
    }

    setStatus({
      type: "saving",
      message: "Saving student profile...",
      detail: ""
    });

    const result = await saveStudentLearningProfileForTeacher({
      teacherId,
      studentId: student.id,
      values: form
    });

    if (result.error) {
      setStatus({
        type: "error",
        message: "Could not update student profile. Please try again.",
        detail: result.error
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Student profile updated successfully.",
      detail: ""
    });
    onSaved(student.id, result.learningProfile);
  }

  return (
    <section className="card teacher-student-editor" aria-labelledby="teacher-student-editor-title">
      <div className="teacher-student-editor__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Edit profile</p>
          <h2 id="teacher-student-editor-title">{student.full_name || "Student"}</h2>
          <p>{student.email || "No email"}</p>
        </div>
        <button className="text-button" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <form className="teacher-student-profile-form" onSubmit={handleSubmit}>
        <div className="teacher-task-form-grid">
          <label>
            Level
            <select
              value={form.level}
              disabled={isSaving}
              onChange={(event) => updateField("level", event.target.value)}
            >
              {levelOptions.map((level) => (
                <option value={level} key={level || "none"}>
                  {level || "No level selected"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Main goal
            <input
              type="text"
              value={form.main_goal}
              disabled={isSaving}
              onChange={(event) => updateField("main_goal", event.target.value)}
              placeholder="Speaking Confidence"
            />
          </label>
          <label>
            Speaking focus
            <input
              type="text"
              value={form.speaking_focus}
              disabled={isSaving}
              onChange={(event) => updateField("speaking_focus", event.target.value)}
              placeholder="Fluency and natural responses"
            />
          </label>
          <label>
            Pronunciation focus
            <input
              type="text"
              value={form.pronunciation_focus}
              disabled={isSaving}
              onChange={(event) => updateField("pronunciation_focus", event.target.value)}
              placeholder="Word stress, rhythm, or clearer sounds"
            />
          </label>
          <label>
            Vocabulary focus
            <input
              type="text"
              value={form.vocabulary_focus}
              disabled={isSaving}
              onChange={(event) => updateField("vocabulary_focus", event.target.value)}
              placeholder="Linking words, topic words, or collocations"
            />
          </label>
          <label>
            Practice target
            <input
              type="text"
              value={form.practice_target}
              disabled={isSaving}
              onChange={(event) => updateField("practice_target", event.target.value)}
              placeholder="Speak for 5 minutes every weekday"
            />
          </label>
          <label>
            Practice duration target
            <input
              type="number"
              min="1"
              value={form.practice_duration_target}
              disabled={isSaving}
              onChange={(event) => updateField("practice_duration_target", event.target.value)}
              placeholder="10"
            />
          </label>
          <label>
            Preferred practice time
            <input
              type="text"
              value={form.preferred_practice_time}
              disabled={isSaving}
              onChange={(event) => updateField("preferred_practice_time", event.target.value)}
              placeholder="After school"
            />
          </label>
          <label>
            Teacher notes
            <textarea
              rows="4"
              value={form.notes}
              disabled={isSaving}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Private learning notes for this student profile."
            />
          </label>
        </div>

        <div className="teacher-assign-submit">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
          <button className="secondary-button" type="button" disabled={isSaving} onClick={onCancel}>
            Cancel
          </button>
        </div>

        {status.message && (
          <div className={`teacher-assign-message teacher-assign-message--${status.type === "saving" ? "submitting" : status.type}`}>
            <p>{status.message}</p>
            {status.detail && <span>{status.detail}</span>}
          </div>
        )}
      </form>
    </section>
  );
}

export function TeacherStudentsPage({ user, profile }) {
  const [students, setStudents] = useState([]);
  const [hasAssignedStudents, setHasAssignedStudents] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStudents([]);
      setError("");
      setHasAssignedStudents(false);
      setSelectedStudent(null);

      if (profile?.role !== "teacher") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getTeacherStudentsOverview(profile.id);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);
      setHasAssignedStudents(result.hasAssignedStudents);

      if (result.error) {
        setError(result.error);
        return;
      }

      setStudents(result.students);
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const selectedStudentFromList = useMemo(
    () => students.find((student) => student.id === selectedStudent?.id) || selectedStudent,
    [selectedStudent, students]
  );

  function handleProfileSaved(studentId, learningProfile) {
    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === studentId
          ? {
              ...student,
              learningProfile
            }
          : student
      )
    );
    setSelectedStudent((current) =>
      current?.id === studentId
        ? {
            ...current,
            learningProfile
          }
        : current
    );
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-students-page">
        <Header user={user} title="My Students" subtitle="Track your assigned students and their speaking progress." />
        <TeacherStudentsState
          title="Student management is only available for teacher accounts."
          message="Students can view their own learning profile on the Profile page."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="teacher-students-page">
        <Header user={user} title="My Students" subtitle="Track your assigned students and their speaking progress." />
        <TeacherStudentsState
          title="Admin student management tools will be added later."
          message="For now, sign in as a teacher to manage assigned students."
        />
      </div>
    );
  }

  return (
    <div className="teacher-students-page">
      <Header user={user} title="My Students" subtitle="Track your assigned students and their speaking progress." />

      {isLoading ? (
        <TeacherStudentsState
          title="Loading assigned students..."
          message="Please wait while we open your student list."
        />
      ) : error ? (
        <TeacherStudentsState
          title="Could not load assigned students."
          message={error}
        />
      ) : !hasAssignedStudents ? (
        <TeacherStudentsState
          title="No students assigned yet."
          message="Once students are linked to your teacher account, you can track and support them here."
        />
      ) : !students.length ? (
        <TeacherStudentsState
          title="No assigned student profiles found."
          message="Your teacher assignment exists, but no readable student profiles were returned."
        />
      ) : (
        <>
          <TeacherStudentStats students={students} />

          <div className="teacher-students-layout">
            <div className="teacher-student-list">
              {students.map((student) => (
                <TeacherStudentCard
                  student={student}
                  isSelected={selectedStudentFromList?.id === student.id}
                  onEdit={setSelectedStudent}
                  key={student.id}
                />
              ))}
            </div>

            {selectedStudentFromList && (
              <StudentProfileEditor
                student={selectedStudentFromList}
                teacherId={profile.id}
                onSaved={handleProfileSaved}
                onCancel={() => setSelectedStudent(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
