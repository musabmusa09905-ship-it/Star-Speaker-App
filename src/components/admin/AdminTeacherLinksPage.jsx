import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { ProfileIcon } from "../icons.jsx";
import {
  getAdminUsersOverview,
  linkStudentToTeacher,
  unlinkStudentFromTeacher
} from "../../lib/adminUsers.js";
import { isAdminLike } from "../../lib/rolePermissions.js";

function getName(profile) {
  return profile?.full_name || profile?.email || "Unnamed user";
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function AdminTeacherLinksState({ title, message, action }) {
  return (
    <section className="card admin-state-card" aria-labelledby="admin-teacher-links-state-title">
      <div className="admin-state-card__icon" aria-hidden="true">
        <ProfileIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher links</p>
        <h2 id="admin-teacher-links-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function filterPeople(items, search) {
  const needle = search.trim().toLowerCase();

  if (!needle) {
    return items;
  }

  return items.filter((item) =>
    [item.full_name, item.email].filter(Boolean).some((value) => value.toLowerCase().includes(needle))
  );
}

function TeacherLinkForm({ teachers, students, onLinked }) {
  const [form, setForm] = useState({ teacherId: "", studentIds: [] });
  const [status, setStatus] = useState({ type: "idle", message: "", detail: "" });
  const isSubmitting = status.type === "submitting";

  function updateField(field, value) {
    setStatus({ type: "idle", message: "", detail: "" });
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.teacherId || !form.studentIds.length) {
      setStatus({
        type: "error",
        message: "Choose one teacher and at least one student.",
        detail: ""
      });
      return;
    }

    setStatus({
      type: "submitting",
      message: "Linking students to teacher...",
      detail: ""
    });

    const results = [];

    for (const studentId of form.studentIds) {
      results.push(await linkStudentToTeacher({ teacherId: form.teacherId, studentId }));
    }

    const failed = results.find((result) => result.error && !result.relationship);

    if (failed) {
      setStatus({
        type: "error",
        message: failed.error,
        detail: ""
      });
      return;
    }

    const duplicateCount = results.filter((result) => result.error && result.relationship).length;
    const successCount = results.filter((result) => !result.error).length;

    setStatus({
      type: "success",
      message: duplicateCount
        ? `${successCount} link(s) updated. ${duplicateCount} selected link(s) already existed.`
        : `${successCount} student link(s) saved.`,
      detail: ""
    });
    setForm((current) => ({ ...current, studentIds: [] }));
    onLinked();
  }

  return (
    <section className="card admin-relationship-card" aria-labelledby="teacher-link-form-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Link students</p>
          <h2 id="teacher-link-form-title">Connect Teacher and Students</h2>
        </div>
      </div>

      <form className="admin-link-form" onSubmit={handleSubmit}>
        <label>
          Teacher
          <select
            value={form.teacherId}
            disabled={isSubmitting || !teachers.length}
            onChange={(event) => updateField("teacherId", event.target.value)}
          >
            <option value="">Choose active teacher</option>
            {teachers.map((teacher) => (
              <option value={teacher.id} key={teacher.id}>
                {getName(teacher)} - {teacher.email}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-user-form-wide">
          Students
          <select
            multiple
            value={form.studentIds}
            disabled={isSubmitting || !students.length}
            onChange={(event) =>
              updateField(
                "studentIds",
                Array.from(event.target.selectedOptions).map((option) => option.value)
              )
            }
          >
            {students.map((student) => (
              <option value={student.id} key={student.id}>
                {getName(student)} - {student.email}
              </option>
            ))}
          </select>
          <small>Hold Ctrl or Cmd to choose more than one student.</small>
        </label>

        <button className="primary-button" type="submit" disabled={isSubmitting || !teachers.length || !students.length}>
          {isSubmitting ? "Linking..." : "Link selected students"}
        </button>
      </form>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}
    </section>
  );
}

function TeacherLinksList({ relationships, onUnlinked }) {
  const [removingId, setRemovingId] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "", detail: "" });

  async function handleUnlink(relationshipId) {
    setRemovingId(relationshipId);
    setStatus({ type: "submitting", message: "Removing link...", detail: "" });

    const result = await unlinkStudentFromTeacher(relationshipId);
    setRemovingId("");

    if (result.error) {
      setStatus({ type: "error", message: result.error, detail: "" });
      return;
    }

    setStatus({ type: "success", message: result.message || "Teacher-student link removed.", detail: "" });
    onUnlinked();
  }

  return (
    <section className="card admin-list-card" aria-labelledby="teacher-link-list-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Current links</p>
          <h2 id="teacher-link-list-title">Teacher-Student Relationships</h2>
        </div>
        <span>{relationships.length} links</span>
      </div>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
        </div>
      )}

      {!relationships.length ? (
        <p className="admin-note">No teacher-student links match this search.</p>
      ) : (
        <div className="admin-relationship-list">
          {relationships.map((relationship) => (
            <article className="admin-relationship-row" key={relationship.id}>
              <div>
                <span>Teacher</span>
                <h3>{getName(relationship.teacher)}</h3>
                <p>{relationship.teacher?.email || "No email"}</p>
              </div>
              <div>
                <span>Student</span>
                <h3>{getName(relationship.student)}</h3>
                <p>{relationship.student?.email || "No email"}</p>
              </div>
              <div className="admin-relationship-status">
                <strong className={relationship.active ? "is-active" : ""}>
                  {relationship.active ? "Active" : "Inactive"}
                </strong>
                <small>Created {formatDate(relationship.created_at)}</small>
                {relationship.active && (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={removingId === relationship.id}
                    onClick={() => handleUnlink(relationship.id)}
                  >
                    {removingId === relationship.id ? "Removing..." : "Remove link"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminTeacherLinksPage({ user, profile }) {
  const [state, setState] = useState({
    isLoading: false,
    error: "",
    activeTeachers: [],
    activeStudents: [],
    relationships: []
  });
  const [filters, setFilters] = useState({ teacher: "", student: "" });

  async function loadTeacherLinks() {
    setState((current) => ({ ...current, isLoading: true, error: "" }));
    const result = await getAdminUsersOverview();
    setState({
      isLoading: false,
      error: result.error || "",
      activeTeachers: result.activeTeachers,
      activeStudents: result.activeStudents,
      relationships: result.relationships
    });
  }

  useEffect(() => {
    if (isAdminLike(profile)) {
      loadTeacherLinks();
    }
  }, [profile?.id, profile?.role]);

  const filteredTeachers = useMemo(
    () => filterPeople(state.activeTeachers, filters.teacher),
    [filters.teacher, state.activeTeachers]
  );
  const filteredStudents = useMemo(
    () => filterPeople(state.activeStudents, filters.student),
    [filters.student, state.activeStudents]
  );
  const filteredRelationships = useMemo(
    () =>
      state.relationships.filter((relationship) => {
        const teacherMatches = filterPeople([relationship.teacher].filter(Boolean), filters.teacher).length > 0;
        const studentMatches = filterPeople([relationship.student].filter(Boolean), filters.student).length > 0;
        return teacherMatches && studentMatches;
      }),
    [filters.teacher, filters.student, state.relationships]
  );

  if (!isAdminLike(profile)) {
    return (
      <div className="admin-users-page">
        <Header user={user} title="Teacher Links" subtitle="Connect teachers and students." />
        <AdminTeacherLinksState
          title="Teacher links are only available for admin and coordinator accounts."
          message="Use an authorized school operations account to manage teacher-student relationships."
        />
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <Header user={user} title="Teacher Links" subtitle="Connect teachers to their assigned students." />

      {state.isLoading ? (
        <AdminTeacherLinksState title="Loading teacher links..." message="Please wait while we load teachers, students, and relationships." />
      ) : state.error ? (
        <AdminTeacherLinksState title="Could not load teacher links." message={state.error} />
      ) : (
        <div className="admin-users-grid">
          <section className="card admin-search-card" aria-label="Teacher links search">
            <label>
              Search teachers
              <input
                type="search"
                value={filters.teacher}
                onChange={(event) => setFilters((current) => ({ ...current, teacher: event.target.value }))}
                placeholder="Teacher name or email"
              />
            </label>
            <label>
              Search students
              <input
                type="search"
                value={filters.student}
                onChange={(event) => setFilters((current) => ({ ...current, student: event.target.value }))}
                placeholder="Student name or email"
              />
            </label>
          </section>

          <TeacherLinkForm
            teachers={filteredTeachers}
            students={filteredStudents}
            onLinked={loadTeacherLinks}
          />
          <TeacherLinksList
            relationships={filteredRelationships}
            onUnlinked={loadTeacherLinks}
          />
        </div>
      )}
    </div>
  );
}
