import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { StudentMotivationProfileForm } from "../students/StudentMotivationProfileForm.jsx";
import { UserAvatar } from "../UserAvatar.jsx";
import { ArticleIcon, FeedbackIcon, ProfileIcon, TargetIcon } from "../icons.jsx";
import {
  getTeacherStudentsOverview,
  saveStudentLearningProfileForTeacher
} from "../../lib/teacherStudents.js";
import {
  formatWhatsAppInputValue,
  getWhatsAppInputValueWithDefault
} from "../../lib/whatsappReminders.js";
import {
  formatLevelForStaff,
  getLevelDescriptionForStaff,
  heartOfEnglishLevels
} from "../../lib/heartOfEnglishLevels.js";

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
    whatsapp_number: student?.whatsapp_number || "",
    whatsapp_opt_in: Boolean(student?.whatsapp_opt_in),
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

function isActiveTask(task) {
  return Boolean(task && ["assigned", "in_progress"].includes(task.status));
}

function needsTeacherReview(submission, feedback) {
  return Boolean(submission?.status === "submitted" && !feedback);
}

function getSubmissionSummary(submission, feedback) {
  if (!submission) {
    return {
      label: "No submission yet",
      detail: "",
      tone: "muted"
    };
  }

  if (feedback || submission.status === "reviewed") {
    return {
      label: "Reviewed",
      detail: formatDateTime(submission.submitted_at),
      tone: "success"
    };
  }

  if (submission.status === "submitted") {
    return {
      label: "Submitted",
      detail: formatDateTime(submission.submitted_at),
      tone: "warning"
    };
  }

  return {
    label: formatLabel(submission.status),
    detail: formatDateTime(submission.submitted_at),
    tone: "muted"
  };
}

function getFeedbackSummary(submission, feedback) {
  if (feedback) {
    return {
      label: "Reviewed",
      detail: formatDateTime(feedback.created_at),
      tone: "success"
    };
  }

  if (submission?.status === "submitted") {
    return {
      label: "Needs review",
      detail: "",
      tone: "warning"
    };
  }

  if (submission) {
    return {
      label: "Waiting for feedback",
      detail: "",
      tone: "muted"
    };
  }

  return {
    label: "No recent feedback",
    detail: "",
    tone: "muted"
  };
}

function compactRows(rows) {
  return rows.filter((row) => {
    if (row.value === 0) {
      return true;
    }

    return Boolean(row.value);
  });
}

function TeacherStudentDetailPanel({ title, rows, emptyMessage }) {
  const visibleRows = compactRows(rows);

  return (
    <section className="teacher-student-detail-panel">
      <h3>{title}</h3>
      {visibleRows.length ? (
        <dl>
          {visibleRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

function TeacherStudentCard({ student, isSelected, isExpanded, onEdit, onToggle }) {
  const learningProfile = student.learningProfile;
  const latestTask = student.latestTask;
  const latestSubmission = student.latestSubmission;
  const latestFeedback = student.latestFeedback;
  const weeklyFocus = student.weeklyFocus;
  const reminderPreferences = student.reminderPreferences;
  const motivationProfile = student.motivationProfile;
  const badgeSummary = student.badgeSummary || { earnedCount: 0, latestEarned: null, nextBadge: null };
  const preferredReminderTime =
    learningProfile?.preferred_practice_time ||
    (reminderPreferences?.id
      ? reminderPreferences.preferredEveningTime || reminderPreferences.preferredMorningTime
      : "") ||
    "";
  const hasActiveTask = isActiveTask(latestTask);
  const reviewNeeded = needsTeacherReview(latestSubmission, latestFeedback);
  const submissionSummary = getSubmissionSummary(latestSubmission, latestFeedback);
  const feedbackSummary = getFeedbackSummary(latestSubmission, latestFeedback);
  const taskTitle = latestTask?.title || "No active task";
  const statusLabel = student.status || "active";
  const primaryAction = reviewNeeded ? (
    <a className="primary-button" href="/teacher/review">Review</a>
  ) : !hasActiveTask ? (
    <a className="primary-button" href="/teacher/daily-planner">Plan task</a>
  ) : (
    <button className="primary-button" type="button" onClick={() => onToggle(student.id)}>
      {isExpanded ? "Hide details" : "View details"}
    </button>
  );

  return (
    <article className={`card teacher-student-card ${isSelected ? "is-selected" : ""} ${isExpanded ? "is-expanded" : ""}`}>
      <div className="teacher-student-card__header">
        <div>
          <p className={`teacher-student-status-pill ${statusLabel === "active" ? "is-active" : "is-muted"}`}>
            {statusLabel}
          </p>
          <h2>{student.full_name || "Student"}</h2>
        </div>
        <div className="teacher-student-card__header-actions">
          <UserAvatar
            avatarUrl={student.avatar_url}
            className="teacher-student-card__avatar"
            initials={(student.full_name || student.email || "S").charAt(0).toUpperCase()}
            name={student.full_name || student.email}
            decorative
          />
          <button
            className="teacher-student-card__toggle"
            type="button"
            onClick={() => onToggle(student.id)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      <div className="teacher-student-operational-summary">
        <div className="teacher-student-operational-item">
          <span>Current task</span>
          <strong>{taskTitle}</strong>
          {latestTask && <small>{formatLabel(latestTask.status)}</small>}
        </div>
        <div className="teacher-student-operational-item">
          <span>Submission</span>
          <strong className={`teacher-student-status-text is-${submissionSummary.tone}`}>
            {submissionSummary.label}
          </strong>
          {submissionSummary.detail && <small>{submissionSummary.detail}</small>}
        </div>
        <div className="teacher-student-operational-item">
          <span>Feedback</span>
          <strong className={`teacher-student-status-text is-${feedbackSummary.tone}`}>
            {feedbackSummary.label}
          </strong>
          {feedbackSummary.detail && <small>{feedbackSummary.detail}</small>}
        </div>
      </div>

      <div className="teacher-student-card__quick-actions">
        {primaryAction}
      </div>

      {isExpanded && (
        <div className="teacher-student-card__details">
          <div className="teacher-student-detail-grid">
            <TeacherStudentDetailPanel
              title="Learning snapshot"
              emptyMessage="No learning snapshot added yet."
              rows={[
                { label: "Goal", value: learningProfile?.main_goal },
                { label: "Speaking focus", value: learningProfile?.speaking_focus },
                { label: "Pronunciation", value: learningProfile?.pronunciation_focus },
                { label: "Vocabulary", value: learningProfile?.vocabulary_focus },
                { label: "Practice target", value: learningProfile?.practice_target },
                {
                  label: "Duration target",
                  value: learningProfile?.practice_duration_target
                    ? `${learningProfile.practice_duration_target} min`
                    : ""
                },
                { label: "Motivation goal", value: motivationProfile?.goal },
                {
                  label: "Motivation style",
                  value: motivationProfile?.motivation_style
                    ? formatLabel(motivationProfile.motivation_style)
                    : ""
                }
              ]}
            />

            <TeacherStudentDetailPanel
              title="Current work"
              emptyMessage="No current work has been recorded yet."
              rows={[
                { label: "Task", value: latestTask?.title },
                { label: "Task status", value: latestTask ? formatLabel(latestTask.status) : "" },
                { label: "Submission", value: submissionSummary.label },
                { label: "Feedback", value: feedbackSummary.label },
                { label: "Weekly focus", value: weeklyFocus?.focusTitle },
                {
                  label: "Habit badges",
                  value: badgeSummary.earnedCount
                    ? `${badgeSummary.earnedCount} earned`
                    : badgeSummary.nextBadge?.label
                }
              ]}
            />

            <TeacherStudentDetailPanel
              title="Contact and reminders"
              emptyMessage="No contact or reminder details added yet."
              rows={[
                { label: "Email", value: student.email },
                { label: "WhatsApp", value: student.whatsapp_number },
                {
                  label: "WhatsApp opt-in",
                  value: student.whatsapp_number
                    ? student.whatsapp_opt_in
                      ? "Allowed"
                      : "Not allowed"
                    : ""
                },
                { label: "Preferred time", value: learningProfile?.preferred_practice_time },
                { label: "Reminder cue", value: preferredReminderTime },
                {
                  label: "In-app reminders",
                  value: reminderPreferences?.id
                    ? reminderPreferences.remindersEnabled
                      ? "Enabled"
                      : "Disabled"
                    : ""
                },
                {
                  label: "Email reminders",
                  value: reminderPreferences?.id
                    ? reminderPreferences.emailRemindersEnabled
                      ? "Enabled"
                      : "Disabled"
                    : ""
                },
                { label: "Email time", value: reminderPreferences?.preferredEmailTime }
              ]}
            />
          </div>

          <div className="teacher-student-actions">
            <a className="secondary-button" href="/teacher/daily-planner">Plan Task</a>
            <a className="secondary-button" href="/teacher/assign">Create manual task</a>
            <a className="secondary-button" href="/teacher/review">Review</a>
            <button className="primary-button" type="button" onClick={() => onEdit(student)}>
              Edit Profile
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function StudentProfileEditor({ student, teacherProfile, onSaved, onMotivationSaved, onCancel }) {
  const [form, setForm] = useState(() => buildInitialForm(student));
  const [status, setStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const isSaving = status.type === "saving";
  const selectedLevelDescription = getLevelDescriptionForStaff(form.level);

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
      teacherId: teacherProfile.id,
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
    onSaved(student.id, result.learningProfile, result.profile);
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
              <option value="">No level selected</option>
              {heartOfEnglishLevels.map((level) => (
                <option value={level.code} key={level.code}>
                  {level.staffLabel}
                </option>
              ))}
              {form.level && !heartOfEnglishLevels.some((level) => level.code === form.level) && (
                <option value={form.level}>{formatLevelForStaff(form.level)}</option>
              )}
            </select>
            {selectedLevelDescription && <small>{selectedLevelDescription}</small>}
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
            WhatsApp number
            <input
              type="tel"
              value={form.whatsapp_number}
              disabled={isSaving}
              onFocus={() =>
                updateField("whatsapp_number", getWhatsAppInputValueWithDefault(form.whatsapp_number))
              }
              onChange={(event) => updateField("whatsapp_number", event.target.value)}
              onBlur={(event) => updateField("whatsapp_number", formatWhatsAppInputValue(event.target.value))}
              placeholder="+90 555 123 45 67"
            />
          </label>
          <label className="teacher-student-checkbox-field">
            <input
              type="checkbox"
              checked={form.whatsapp_opt_in}
              disabled={isSaving}
              onChange={(event) => updateField("whatsapp_opt_in", event.target.checked)}
            />
            WhatsApp reminders allowed
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

      <StudentMotivationProfileForm
        student={student}
        actorProfile={teacherProfile}
        onSaved={onMotivationSaved}
      />
    </section>
  );
}

export function TeacherStudentsPage({ user, profile }) {
  const [students, setStudents] = useState([]);
  const [hasAssignedStudents, setHasAssignedStudents] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStudentIds, setExpandedStudentIds] = useState(() => new Set());

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
  const filteredStudents = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    if (!needle) {
      return students;
    }

    return students.filter((student) =>
      [student.full_name, student.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    );
  }, [searchTerm, students]);

  function toggleStudentDetails(studentId) {
    setExpandedStudentIds((current) => {
      const next = new Set(current);

      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }

      return next;
    });
  }

  function handleEditStudent(student) {
    setSelectedStudent(student);
    setExpandedStudentIds((current) => new Set(current).add(student.id));
  }

  function handleProfileSaved(studentId, learningProfile, updatedProfile) {
    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === studentId
          ? {
              ...student,
              ...(updatedProfile || {}),
              learningProfile
            }
          : student
      )
    );
    setSelectedStudent((current) =>
      current?.id === studentId
        ? {
            ...current,
            ...(updatedProfile || {}),
            learningProfile
          }
        : current
    );
  }

  function handleMotivationSaved(studentId, motivationProfile) {
    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === studentId
          ? {
              ...student,
              motivationProfile
            }
          : student
      )
    );
    setSelectedStudent((current) =>
      current?.id === studentId
        ? {
            ...current,
            motivationProfile
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
          title="Teacher student lists are shown for teacher accounts."
          message="Admins can link teachers and students from Admin Users."
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

          <section className="card teacher-students-search-card" aria-label="Search assigned students">
            <label>
              Search assigned students
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by student name or email"
              />
            </label>
            <p>
              Teachers only see students actively linked to their own account.
            </p>
          </section>

          <div className="teacher-students-layout">
            <div className="teacher-student-list">
              {filteredStudents.length ? (
                filteredStudents.map((student) => (
                  <TeacherStudentCard
                    student={student}
                    isSelected={selectedStudentFromList?.id === student.id}
                    isExpanded={expandedStudentIds.has(student.id)}
                    onEdit={handleEditStudent}
                    onToggle={toggleStudentDetails}
                    key={student.id}
                  />
                ))
              ) : (
                <TeacherStudentsState
                  title="No assigned students match this search."
                  message="Try another name or email from your assigned student list."
                />
              )}
            </div>

            {selectedStudentFromList && (
              <StudentProfileEditor
                student={selectedStudentFromList}
                teacherProfile={profile}
                onSaved={handleProfileSaved}
                onMotivationSaved={handleMotivationSaved}
                onCancel={() => setSelectedStudent(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
