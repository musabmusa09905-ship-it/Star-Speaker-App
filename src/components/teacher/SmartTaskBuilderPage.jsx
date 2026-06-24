import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { TargetIcon } from "../icons.jsx";
import {
  assignSmartTaskDraft,
  generateSmartTaskDrafts,
  getSmartBuilderStudentProfile,
  getSmartTaskBuilderStudents,
  smartTaskTypes
} from "../../lib/smartTaskBuilder.js";
import { isAdminLike } from "../../lib/rolePermissions.js";

const TEMPLATE_STORAGE_KEY = "heartOfEnglishSmartTaskTemplates";

function formatLabel(value) {
  if (!value) {
    return "Not set";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function todayInputValue() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
}

function parseLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createBuilderForm(studentId = "") {
  return {
    studentId,
    taskType: "speaking",
    dayNumber: "1",
    weeklyFocus: "",
    numberOfTasks: "1",
    dueDate: todayInputValue(),
    estimatedMinutes: "10",
    specialInstruction: ""
  };
}

function createEmptyDraft() {
  return {
    draft_type: "task",
    title: "",
    description: "",
    instructions: "",
    task_type: "speaking",
    estimated_minutes: "10",
    level: "",
    focus: "",
    due_date: todayInputValue(),
    guiding_phrases: "",
    checklist: "",
    prompt: "",
    min_words: "80"
  };
}

function isWritingDraft(draft) {
  return draft?.draft_type === "writing" || draft?.task_type === "writing";
}

function BuilderState({ title, message }) {
  return (
    <section className="card teacher-assign-state" aria-labelledby="smart-builder-state-title">
      <div className="teacher-assign-state__icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Smart Task Builder</p>
        <h2 id="smart-builder-state-title">{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function StudentProfileSummary({ student }) {
  const profile = student ? getSmartBuilderStudentProfile(student) : null;

  if (!student) {
    return (
      <div className="smart-builder-profile-summary">
        <p>Select a student to use their learning profile in the draft.</p>
      </div>
    );
  }

  const items = [
    ["Age", profile?.age],
    ["Level", profile?.level],
    ["Goal", profile?.main_goal],
    ["Speaking focus", profile?.speaking_focus],
    ["Pronunciation", profile?.pronunciation_focus],
    ["Vocabulary", profile?.vocabulary_focus],
    ["Practice target", profile?.practice_target],
    ["Strengths", profile?.strengths],
    ["Weaknesses", profile?.weaknesses],
    ["App focus", profile?.app_focus],
    ["Preferred tasks", profile?.preferred_tasks],
    ["Avoid", profile?.avoid_list],
    ["Notes", profile?.notes]
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="smart-builder-profile-summary">
      <strong>{student.full_name || "Student"}</strong>
      <span>{student.email || "No email"}</span>
      {items.length ? (
        <dl>
          {items.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>No learning profile notes yet. The draft will use general speaking-practice defaults.</p>
      )}
    </div>
  );
}

function DraftEditor({ draft, disabled, onChange }) {
  const isWriting = isWritingDraft(draft);

  return (
    <section className="card teacher-assign-card smart-builder-draft-card" aria-labelledby="smart-draft-title">
      <div className="teacher-assign-card__header">
        <p className="card-eyebrow card-eyebrow--red">Editable draft</p>
        <h2 id="smart-draft-title">Review before assigning</h2>
      </div>

      <div className="teacher-task-form-grid">
        <label>
          Task title
          <input
            type="text"
            value={draft.title}
            disabled={disabled}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Generated task title"
          />
        </label>
        {isWriting ? (
          <>
            <label>
              Prompt
              <textarea
                rows="5"
                value={draft.prompt || ""}
                disabled={disabled}
                onChange={(event) => onChange("prompt", event.target.value)}
              />
            </label>
            <label>
              Instructions
              <textarea
                rows="4"
                value={draft.instructions}
                disabled={disabled}
                onChange={(event) => onChange("instructions", event.target.value)}
              />
            </label>
            <label>
              Focus
              <input
                type="text"
                value={draft.focus}
                disabled={disabled}
                onChange={(event) => onChange("focus", event.target.value)}
              />
            </label>
            <label>
              Level
              <input
                type="text"
                value={draft.level}
                disabled={disabled}
                onChange={(event) => onChange("level", event.target.value)}
                placeholder="Intermediate"
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={draft.due_date}
                disabled={disabled}
                onChange={(event) => onChange("due_date", event.target.value)}
              />
            </label>
            <label>
              Minimum words
              <input
                type="number"
                min="1"
                value={draft.min_words || "80"}
                disabled={disabled}
                onChange={(event) => onChange("min_words", event.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Task type
              <select
                value={draft.task_type}
                disabled={disabled}
                onChange={(event) => onChange("task_type", event.target.value)}
              >
                {smartTaskTypes.map((type) => (
                  <option value={type} key={type}>{formatLabel(type)}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                rows="3"
                value={draft.description}
                disabled={disabled}
                onChange={(event) => onChange("description", event.target.value)}
              />
            </label>
            <label>
              Instructions
              <textarea
                rows="4"
                value={draft.instructions}
                disabled={disabled}
                onChange={(event) => onChange("instructions", event.target.value)}
              />
            </label>
            <label>
              Estimated minutes
              <input
                type="number"
                min="1"
                value={draft.estimated_minutes}
                disabled={disabled}
                onChange={(event) => onChange("estimated_minutes", event.target.value)}
              />
            </label>
            <label>
              Level
              <input
                type="text"
                value={draft.level}
                disabled={disabled}
                onChange={(event) => onChange("level", event.target.value)}
                placeholder="Intermediate"
              />
            </label>
            <label>
              Focus
              <input
                type="text"
                value={draft.focus}
                disabled={disabled}
                onChange={(event) => onChange("focus", event.target.value)}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={draft.due_date}
                disabled={disabled}
                onChange={(event) => onChange("due_date", event.target.value)}
              />
            </label>
            <label>
              Guiding phrases
              <textarea
                rows="5"
                value={draft.guiding_phrases}
                disabled={disabled}
                onChange={(event) => onChange("guiding_phrases", event.target.value)}
              />
              <small>One phrase per line.</small>
            </label>
            <label>
              Checklist items
              <textarea
                rows="5"
                value={draft.checklist}
                disabled={disabled}
                onChange={(event) => onChange("checklist", event.target.value)}
              />
              <small>One checklist item per line.</small>
            </label>
          </>
        )}
      </div>
    </section>
  );
}

export function SmartTaskBuilderPage({ user, profile }) {
  const [students, setStudents] = useState([]);
  const [builderForm, setBuilderForm] = useState(createBuilderForm());
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "", detail: "" });
  const isBusy = status.type === "submitting";

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setIsLoading(true);
      setStatus({ type: "idle", message: "", detail: "" });

      const result = await getSmartTaskBuilderStudents(profile);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setStatus({ type: "error", message: result.error, detail: "" });
        return;
      }

      setStudents(result.students);

      if (result.students.length) {
        setBuilderForm(createBuilderForm(result.students[0].id));
      }
    }

    if (profile?.role === "teacher" || isAdminLike(profile)) {
      loadStudents();
    }

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === builderForm.studentId) || null,
    [students, builderForm.studentId]
  );
  const selectedDraft = drafts[selectedDraftIndex] || createEmptyDraft();
  const hasDraft = drafts.length > 0;
  const selectedDraftIsWriting = isWritingDraft(selectedDraft);

  function updateBuilderField(field, value) {
    setStatus({ type: "idle", message: "", detail: "" });
    setBuilderForm((current) => ({ ...current, [field]: value }));
  }

  function updateDraftField(field, value) {
    setStatus({ type: "idle", message: "", detail: "" });
    setDrafts((current) =>
      current.map((draft, index) =>
        index === selectedDraftIndex
          ? field === "task_type" && value === "writing"
            ? {
                ...draft,
                draft_type: "writing",
                task_type: "writing",
                prompt: draft.prompt || draft.description || "",
                min_words: draft.min_words || "80",
                estimated_minutes: ""
              }
            : field === "task_type"
              ? {
                  ...draft,
                  draft_type: "task",
                  task_type: value,
                  description: draft.description || draft.prompt || "",
                  estimated_minutes: draft.estimated_minutes || builderForm.estimatedMinutes || "10"
                }
              : {
                  ...draft,
                  [field]: value
                }
          : draft
      )
    );
  }

  function validateBuilder() {
    if (!builderForm.studentId || !selectedStudent) {
      return "Choose a student.";
    }

    if (!smartTaskTypes.includes(builderForm.taskType)) {
      return "Choose a valid task type.";
    }

    if (Number(builderForm.numberOfTasks) < 1 || Number(builderForm.numberOfTasks) > 5) {
      return "Choose between 1 and 5 tasks.";
    }

    if (!Number.isFinite(Number(builderForm.estimatedMinutes)) || Number(builderForm.estimatedMinutes) <= 0) {
      return "Estimated minutes must be positive.";
    }

    if (builderForm.dueDate && Number.isNaN(new Date(`${builderForm.dueDate}T00:00:00`).getTime())) {
      return "Choose a valid due date.";
    }

    return "";
  }

  function handleGenerate() {
    const validationError = validateBuilder();

    if (validationError) {
      setStatus({ type: "error", message: validationError, detail: "" });
      return;
    }

    const nextDrafts = generateSmartTaskDrafts({
      student: selectedStudent,
      values: builderForm
    });

    setDrafts(nextDrafts);
    setSelectedDraftIndex(0);
    setStatus({
      type: "success",
      message: nextDrafts.length === 1 ? "Task draft generated." : `${nextDrafts.length} task drafts generated.`,
      detail: "This is local template logic. A future AI generator can replace the draft function without changing the approval flow."
    });
  }

  function handleSaveTemplate() {
    if (!hasDraft) {
      setStatus({ type: "error", message: "Generate a task draft before saving a template.", detail: "" });
      return;
    }

    const template = {
      ...selectedDraft,
      saved_at: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY) || "[]");
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify([template, ...existing].slice(0, 20)));
      setStatus({ type: "success", message: "Template saved locally.", detail: "Database template storage can be connected later if needed." });
    } catch {
      setStatus({ type: "error", message: "Could not save template in this browser.", detail: "" });
    }
  }

  async function handleAssignTask() {
    if (!hasDraft) {
      setStatus({ type: "error", message: "Generate and review a draft before assigning.", detail: "" });
      return;
    }

    if (!selectedStudent) {
      setStatus({ type: "error", message: "Choose a student before assigning.", detail: "" });
      return;
    }

    if (!selectedDraft.title.trim()) {
      setStatus({ type: "error", message: "Task title is required before assigning.", detail: "" });
      return;
    }

    const selectedDraftIsWriting = isWritingDraft(selectedDraft);

    if (selectedDraftIsWriting && !selectedDraft.prompt?.trim()) {
      setStatus({ type: "error", message: "Writing prompt is required before assigning.", detail: "" });
      return;
    }

    if (selectedDraftIsWriting && (!Number.isFinite(Number(selectedDraft.min_words)) || Number(selectedDraft.min_words) <= 0)) {
      setStatus({ type: "error", message: "Minimum words must be positive before assigning writing.", detail: "" });
      return;
    }

    setStatus({ type: "submitting", message: selectedDraftIsWriting ? "Assigning writing task..." : "Assigning smart task...", detail: "" });

    const result = await assignSmartTaskDraft({
      profile,
      values: {
        draft_type: selectedDraft.draft_type,
        student_id: selectedStudent.id,
        title: selectedDraft.title.trim(),
        description: selectedDraft.description,
        prompt: selectedDraft.prompt,
        instructions: selectedDraft.instructions,
        task_type: selectedDraft.task_type,
        estimated_minutes: Math.round(Number(selectedDraft.estimated_minutes) || 10),
        level: selectedDraft.level,
        focus: selectedDraft.focus,
        due_date: selectedDraft.due_date,
        min_words: Math.round(Number(selectedDraft.min_words) || 80),
        guiding_phrases: parseLines(selectedDraft.guiding_phrases),
        checklist: parseLines(selectedDraft.checklist)
      }
    });

    if (result.error) {
      setStatus({
        type: "error",
        message: "Could not assign this smart task.",
        detail: result.error
      });
      return;
    }

    setStatus({
      type: "success",
      message: selectedDraftIsWriting ? "Writing task assigned successfully." : "Smart task assigned successfully.",
      detail: `${result.task.title} was assigned to ${selectedStudent.full_name || "Student"}.`
    });
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-assign-page smart-builder-page">
        <Header user={user} title="Smart Task Builder" subtitle="Generate focused homework drafts." />
        <BuilderState
          title="Smart Task Builder is only available for teacher, coordinator, and admin accounts."
          message="Students receive assigned tasks on the Practice page."
        />
      </div>
    );
  }

  if (!(profile?.role === "teacher" || isAdminLike(profile))) {
    return (
      <div className="teacher-assign-page smart-builder-page">
        <Header user={user} title="Smart Task Builder" subtitle="Generate focused homework drafts." />
        <BuilderState title="Sign in with a teacher, coordinator, or admin account." message="This page creates editable task drafts for students." />
      </div>
    );
  }

  return (
    <div className="teacher-assign-page smart-builder-page">
      <Header
        user={user}
        title="Smart Task Builder"
        subtitle="Generate student-specific homework drafts, then review and assign."
      />

      {isLoading ? (
        <BuilderState title="Loading students..." message="Please wait while we open the student list." />
      ) : !students.length ? (
        <BuilderState
          title={profile.role === "teacher" ? "No assigned students yet." : "No students found."}
          message={
            profile.role === "teacher"
              ? "Once students are linked to your teacher account, you can generate tasks here."
              : "Create or connect student profiles before using Smart Task Builder."
          }
        />
      ) : (
        <div className="smart-builder-grid">
          <section className="card teacher-assign-card smart-builder-control-card" aria-labelledby="smart-builder-controls-title">
            <div className="teacher-assign-card__header">
              <p className="card-eyebrow card-eyebrow--red">Builder inputs</p>
              <h2 id="smart-builder-controls-title">Generate a task draft</h2>
            </div>

            <div className="teacher-task-form-grid">
              <label>
                Student
                <select
                  value={builderForm.studentId}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("studentId", event.target.value)}
                >
                  {students.map((student) => (
                    <option value={student.id} key={student.id}>
                      {student.full_name || student.email || "Student"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Task type
                <select
                  value={builderForm.taskType}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("taskType", event.target.value)}
                >
                  {smartTaskTypes.map((type) => (
                    <option value={type} key={type}>{formatLabel(type)}</option>
                  ))}
                </select>
              </label>
              <label>
                Day number
                <input
                  type="number"
                  min="1"
                  value={builderForm.dayNumber}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("dayNumber", event.target.value)}
                />
              </label>
              <label>
                Number of tasks
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={builderForm.numberOfTasks}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("numberOfTasks", event.target.value)}
                />
              </label>
              <label>
                Weekly focus
                <input
                  type="text"
                  value={builderForm.weeklyFocus}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("weeklyFocus", event.target.value)}
                  placeholder="Connectors and speaking flow"
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={builderForm.dueDate}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("dueDate", event.target.value)}
                />
              </label>
              <label>
                Estimated minutes
                <input
                  type="number"
                  min="1"
                  value={builderForm.estimatedMinutes}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("estimatedMinutes", event.target.value)}
                />
              </label>
              <label>
                Special instruction
                <textarea
                  rows="3"
                  value={builderForm.specialInstruction}
                  disabled={isBusy}
                  onChange={(event) => updateBuilderField("specialInstruction", event.target.value)}
                  placeholder="Keep the answer short and avoid forced advanced phrases."
                />
              </label>
            </div>

            <StudentProfileSummary student={selectedStudent} />

            <div className="teacher-assign-submit smart-builder-actions">
              <button className="primary-button" type="button" disabled={isBusy} onClick={handleGenerate}>
                Generate Task
              </button>
              <button className="secondary-button" type="button" disabled={isBusy || !hasDraft} onClick={handleGenerate}>
                Regenerate
              </button>
            </div>
            <p className="teacher-assign-card__note">
              Smart Builder uses student profiles and local templates. Review before assigning.
            </p>
          </section>

          <div className="smart-builder-draft-column">
            {drafts.length > 1 && (
              <section className="card teacher-assign-card smart-builder-draft-tabs" aria-label="Generated drafts">
                {drafts.map((draft, index) => (
                  <button
                    type="button"
                    className={index === selectedDraftIndex ? "is-selected" : ""}
                    onClick={() => setSelectedDraftIndex(index)}
                    key={`${draft.title}-${index}`}
                  >
                    Draft {index + 1} - {isWritingDraft(draft) ? "Writing" : formatLabel(draft.task_type)}
                  </button>
                ))}
              </section>
            )}

            <DraftEditor draft={selectedDraft} disabled={isBusy || !hasDraft} onChange={updateDraftField} />

            <section className="teacher-assign-submit smart-builder-actions">
              <button className="primary-button" type="button" disabled={isBusy || !hasDraft} onClick={handleAssignTask}>
                {isBusy ? "Assigning task..." : selectedDraftIsWriting ? "Assign Writing Task" : "Assign Task"}
              </button>
              <button className="secondary-button" type="button" disabled={isBusy || !hasDraft} onClick={handleSaveTemplate}>
                Save as Template
              </button>
              {profile.role === "teacher" && (
                <>
                  <a className="secondary-button" href="/teacher/assign">Create manual task</a>
                  <a className="secondary-button" href="/teacher/daily-planner">Back to Daily Planner</a>
                </>
              )}
            </section>

            {status.message && (
              <div className={`teacher-assign-message teacher-assign-message--${status.type}`}>
                <p>{status.message}</p>
                {status.detail && <span>{status.detail}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
