import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { TargetIcon } from "../icons.jsx";
import {
  createAssignedTaskForTeacher,
  getAssignedStudentsForTeacher
} from "../../lib/teacherAssignments.js";
import { getActiveLibraryResources } from "../../lib/libraryResources.js";
import { formatLevelForStaff, heartOfEnglishLevels } from "../../lib/heartOfEnglishLevels.js";

const taskTypes = [
  "speaking",
  "shadowing",
  "photo_description",
  "vocabulary_activation",
  "pronunciation",
  "reflection"
];

const starterTemplates = [
  {
    label: "Weekend Reflection",
    values: {
      title: "Talk about your weekend",
      description: "Record a short answer about what you did, what you enjoyed, and how you felt.",
      instructions: "Speak for 60-90 seconds. Use past tense and give clear details.",
      task_type: "speaking",
      estimated_minutes: "10",
      focus: "Fluency and past tense",
      guiding_phrases: "Over the weekend, I...\nOn Saturday, I...\nAfter that, I...\nI enjoyed it because...\nI felt...",
      checklist: "Use past tense\nGive at least three details\nSpeak for at least 60 seconds\nAvoid long silence"
    }
  },
  {
    label: "Favorite Place",
    values: {
      title: "Describe your favorite place",
      description: "Talk about a place you like and explain why it is special for you.",
      instructions: "Speak clearly. Describe what you can see, what you do there, and why you like it.",
      task_type: "speaking",
      estimated_minutes: "10",
      focus: "Description and details",
      guiding_phrases: "My favorite place is...\nI like this place because...\nWhen I go there, I usually...\nIt makes me feel...",
      checklist: "Describe the place clearly\nExplain why it is important\nUse descriptive adjectives\nSpeak with confidence"
    }
  },
  {
    label: "Photo Description",
    values: {
      title: "Describe a photo",
      description: "Look at a photo prompt from your teacher and describe what you see.",
      instructions: "Describe people, place, actions, and possible feelings. Make guesses using natural language.",
      task_type: "photo_description",
      estimated_minutes: "8",
      focus: "Photo description",
      guiding_phrases: "In the picture, I can see...\nIt looks like...\nThe people might be...\nIn the background...",
      checklist: "Mention people\nMention place\nMention actions\nMake one guess\nUse clear pronunciation"
    }
  },
  {
    label: "IELTS Part 2 Practice",
    values: {
      title: "IELTS Part 2 speaking practice",
      description: "Answer a long-turn speaking prompt with a clear beginning, details, and ending.",
      instructions: "Speak for 90 seconds. Organize your answer and avoid stopping too early.",
      task_type: "speaking",
      estimated_minutes: "12",
      focus: "Fluency and structure",
      guiding_phrases: "I would like to talk about...\nThe main reason is...\nAnother important point is...\nOverall, I think...",
      checklist: "Speak for at least 60 seconds\nOrganize your ideas\nUse linking words\nGive examples"
    }
  },
  {
    label: "Opinion Practice",
    values: {
      title: "Give your opinion",
      description: "Share your opinion about a familiar topic and support it with reasons.",
      instructions: "State your opinion clearly, give two reasons, and add one example.",
      task_type: "reflection",
      estimated_minutes: "10",
      focus: "Opinion and reasons",
      guiding_phrases: "In my opinion...\nI believe this because...\nFor example...\nOn the other hand...",
      checklist: "State your opinion\nGive two reasons\nAdd one example\nUse linking words"
    }
  }
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

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function previewText(value, maxLength = 240) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function getResourceFocus(resource) {
  if (resource.focus) {
    return resource.focus;
  }

  if (Array.isArray(resource.tags) && resource.tags.length) {
    return resource.tags.join(", ");
  }

  return resource.category || formatLabel(resource.resource_type);
}

function mapResourceTypeToTaskType(resource) {
  const tagText = Array.isArray(resource.tags) ? resource.tags.join(" ").toLowerCase() : "";

  if (tagText.includes("vocabulary")) {
    return "vocabulary_activation";
  }

  if (resource.resource_type === "pronunciation_drill") {
    return "pronunciation";
  }

  if (resource.resource_type === "photo_prompt") {
    return "photo_description";
  }

  return "speaking";
}

function buildResourceInstructions(resource) {
  const parts = [];

  if (resource.content) {
    parts.push(resource.content);
  }

  if (resource.url) {
    parts.push(`Review this resource before recording: ${resource.url}`);
  }

  if (resource.resource_type === "pdf" || resource.file_path) {
    parts.push("Open the PDF from the Library before recording your answer.");
  }

  if (!parts.length) {
    parts.push("Use this library resource as preparation before recording your answer.");
  }

  return parts.join("\n\n");
}

function createInitialForm(studentId = "") {
  return {
    student_id: studentId,
    title: "",
    description: "",
    instructions: "",
    task_type: "speaking",
    estimated_minutes: "10",
    level: "",
    focus: "",
    due_date: toDateInputValue(),
    guiding_phrases: "",
    checklist: ""
  };
}

function TeacherAssignState({ title, message }) {
  return (
    <section className="card teacher-assign-state" aria-labelledby="teacher-assign-state-title">
      <div className="teacher-assign-state__icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Assign task</p>
        <h2 id="teacher-assign-state-title">{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function StudentSelector({ students, selectedStudentId, disabled, onSelect }) {
  return (
    <section className="card teacher-assign-card" aria-labelledby="student-selector-title">
      <div className="teacher-assign-card__header">
        <p className="card-eyebrow card-eyebrow--red">Student</p>
        <h2 id="student-selector-title">Choose an assigned student</h2>
      </div>

      <div className="teacher-student-picker">
        {students.map((student) => {
          const isSelected = student.id === selectedStudentId;
          const learningProfile = student.learningProfile;

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
                {student.status || "active"}
                {learningProfile?.level ? ` - ${formatLevelForStaff(learningProfile.level)}` : ""}
                {learningProfile?.main_goal ? ` - ${learningProfile.main_goal}` : ""}
              </em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StarterTemplateSelector({ disabled, onSelect }) {
  return (
    <section className="card teacher-assign-card" aria-labelledby="starter-template-title">
      <div className="teacher-assign-card__header">
        <p className="card-eyebrow card-eyebrow--red">Starter templates</p>
        <h2 id="starter-template-title">Start faster, then edit</h2>
      </div>

      <div className="teacher-template-picker">
        {starterTemplates.map((template) => (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(template)}
            key={template.label}
          >
            <span>{template.label}</span>
            <small>{formatLabel(template.values.task_type)} - {template.values.estimated_minutes} min</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function LibraryResourceSelector({ resources, isLoading, error, disabled, onSelect }) {
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId);

  return (
    <section className="card teacher-assign-card" aria-labelledby="library-resource-title">
      <div className="teacher-assign-card__header">
        <p className="card-eyebrow card-eyebrow--red">Library resource</p>
        <h2 id="library-resource-title">Use a library resource</h2>
      </div>

      <p className="teacher-assign-card__note">
        School materials can prefill this task. You can edit everything before assigning.
      </p>

      {isLoading ? (
        <p className="teacher-assign-card__note">Loading library resources...</p>
      ) : error ? (
        <p className="teacher-assign-card__note">{error}</p>
      ) : !resources.length ? (
        <p className="teacher-assign-card__note">No active library resources are available yet.</p>
      ) : (
        <div className="teacher-library-resource-picker">
          <label>
            Resource
            <select
              value={selectedResourceId}
              disabled={disabled}
              onChange={(event) => setSelectedResourceId(event.target.value)}
            >
              <option value="">Choose a library resource</option>
              {resources.map((resource) => (
                <option value={resource.id} key={resource.id}>
                  {resource.title} - {formatLabel(resource.resource_type)}
                  {resource.level ? ` - ${formatLevelForStaff(resource.level)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            type="button"
            disabled={disabled || !selectedResource}
            onClick={() => onSelect(selectedResource)}
          >
            Use resource
          </button>
        </div>
      )}
    </section>
  );
}

function SubmitStatus({ status, onAssignAnother }) {
  if (!status.message) {
    return null;
  }

  return (
    <div className={`teacher-assign-message teacher-assign-message--${status.type}`}>
      <p>{status.message}</p>
      {status.detail && <span>{status.detail}</span>}
      {status.type === "success" && (
        <div className="teacher-assign-message__actions">
          <button className="secondary-button" type="button" onClick={onAssignAnother}>
            Assign another
          </button>
          <a className="primary-button" href="/teacher/tasks">View Task History</a>
        </div>
      )}
    </div>
  );
}

export function TeacherAssignPage({ user, profile }) {
  const [students, setStudents] = useState([]);
  const [libraryResources, setLibraryResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const [form, setForm] = useState(createInitialForm());
  const [submitStatus, setSubmitStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const isSubmitting = submitStatus.type === "submitting";

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStudents([]);
      setLibraryResources([]);
      setLoadError("");
      setLibraryError("");

      if (profile?.role !== "teacher") {
        setIsLoading(false);
        setIsLoadingResources(false);
        return;
      }

      setIsLoading(true);
      setIsLoadingResources(true);
      const [result, libraryResult] = await Promise.all([
        getAssignedStudentsForTeacher(profile.id),
        getActiveLibraryResources()
      ]);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);
      setIsLoadingResources(false);

      if (result.error) {
        setLoadError(result.error);
      } else {
        setStudents(result.students);

        if (result.students.length > 0) {
          setForm(createInitialForm(result.students[0].id));
        }
      }

      if (libraryResult.error) {
        setLibraryError(libraryResult.error);
      } else {
        setLibraryResources(libraryResult.resources);
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === form.student_id) || null,
    [form.student_id, students]
  );

  function updateField(field, value) {
    setSubmitStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setForm(createInitialForm(form.student_id));
    setSubmitStatus({ type: "idle", message: "", detail: "" });
  }

  function applyStarterTemplate(template) {
    setSubmitStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setForm((current) => ({
      ...current,
      ...template.values,
      student_id: current.student_id,
      level: current.level,
      due_date: current.due_date || toDateInputValue()
    }));
  }

  function applyLibraryResource(resource) {
    if (!resource) {
      return;
    }

    setSubmitStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setForm((current) => ({
      ...current,
      title: resource.title || current.title,
      description: resource.description || previewText(resource.content) || current.description,
      instructions: buildResourceInstructions(resource),
      task_type: mapResourceTypeToTaskType(resource),
      level: resource.level || current.level,
      focus: getResourceFocus(resource),
      student_id: current.student_id,
      due_date: current.due_date || toDateInputValue()
    }));
  }

  function validateForm() {
    if (!form.student_id) {
      return "Choose a student.";
    }

    if (!students.some((student) => student.id === form.student_id)) {
      return "You can only assign tasks to your assigned students.";
    }

    if (!form.title.trim()) {
      return "Task title is required.";
    }

    if (!taskTypes.includes(form.task_type)) {
      return "Choose a valid task type.";
    }

    const estimatedMinutes = Number(form.estimated_minutes);

    if (!Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
      return "Estimated minutes must be a positive number.";
    }

    if (form.due_date && Number.isNaN(new Date(`${form.due_date}T00:00:00`).getTime())) {
      return "Choose a valid due date.";
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
      message: "Assigning task...",
      detail: ""
    });

    const result = await createAssignedTaskForTeacher({
      teacherId: profile.id,
      values: {
        ...form,
        title: form.title.trim(),
        estimated_minutes: Math.round(Number(form.estimated_minutes)),
        guiding_phrases: parseLines(form.guiding_phrases),
        checklist: parseLines(form.checklist)
      }
    });

    if (result.error) {
      setSubmitStatus({
        type: "error",
        message: "Could not assign task. Please try again.",
        detail: result.error
      });
      return;
    }

    setSubmitStatus({
      type: "success",
      message: "Task assigned successfully.",
      detail: selectedStudent ? `${result.task.title} was assigned to ${selectedStudent.full_name || "Student"}.` : ""
    });
    setForm(createInitialForm(form.student_id));
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-assign-page">
        <Header user={user} title="Assign Task" subtitle="Create a focused speaking task for your student." />
        <TeacherAssignState
          title="Task assignment is only available for teacher accounts."
          message="Students can view assigned tasks on the Practice page."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="teacher-assign-page">
        <Header user={user} title="Assign Task" subtitle="Create a focused speaking task for your student." />
        <TeacherAssignState
          title="Task assignment is handled by teacher accounts."
          message="Use a teacher account linked to students to assign speaking tasks."
        />
      </div>
    );
  }

  return (
    <div className="teacher-assign-page">
      <Header user={user} title="Assign Task" subtitle="Create a focused speaking task for your student." />

      {isLoading ? (
        <TeacherAssignState
          title="Loading assigned students..."
          message="Please wait while we open your student list."
        />
      ) : loadError ? (
        <TeacherAssignState
          title="Could not load assigned students."
          message={loadError}
        />
      ) : !students.length ? (
        <TeacherAssignState
          title="No students assigned yet."
          message="Once students are linked to your teacher account, you can assign speaking tasks here."
        />
      ) : (
        <form className="teacher-assign-form" onSubmit={handleSubmit}>
          <StudentSelector
            students={students}
            selectedStudentId={form.student_id}
            disabled={isSubmitting}
            onSelect={(studentId) => updateField("student_id", studentId)}
          />

          <StarterTemplateSelector disabled={isSubmitting} onSelect={applyStarterTemplate} />

          <LibraryResourceSelector
            resources={libraryResources}
            isLoading={isLoadingResources}
            error={libraryError}
            disabled={isSubmitting}
            onSelect={applyLibraryResource}
          />

          <section className="card teacher-assign-card" aria-labelledby="task-details-title">
            <div className="teacher-assign-card__header">
              <p className="card-eyebrow card-eyebrow--red">Task details</p>
              <h2 id="task-details-title">Create the speaking task</h2>
            </div>

            <div className="teacher-task-form-grid">
              <label>
                Task title
                <input
                  type="text"
                  value={form.title}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Talk about your weekend"
                  required
                />
              </label>
              <label>
                Task type
                <select
                  value={form.task_type}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("task_type", event.target.value)}
                  required
                >
                  {taskTypes.map((type) => (
                    <option value={type} key={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  rows="3"
                  value={form.description}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Record a short answer about what you did, what you enjoyed, and how you felt."
                />
              </label>
              <label>
                Instructions
                <textarea
                  rows="3"
                  value={form.instructions}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("instructions", event.target.value)}
                  placeholder="Speak for 60-90 seconds. Use past tense and give clear details."
                />
              </label>
              <label>
                Estimated minutes
                <input
                  type="number"
                  min="1"
                  value={form.estimated_minutes}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("estimated_minutes", event.target.value)}
                />
              </label>
              <label>
                Level
                <select
                  value={form.level}
                  disabled={isSubmitting}
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
              </label>
              <label>
                Focus
                <input
                  type="text"
                  value={form.focus}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("focus", event.target.value)}
                  placeholder="Fluency and past tense"
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={form.due_date}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("due_date", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="card teacher-assign-card" aria-labelledby="task-support-title">
            <div className="teacher-assign-card__header">
              <p className="card-eyebrow card-eyebrow--red">Guiding support</p>
              <h2 id="task-support-title">Add phrases and checklist items</h2>
            </div>

            <div className="teacher-task-form-grid">
              <label>
                Guiding phrases
                <textarea
                  rows="5"
                  value={form.guiding_phrases}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("guiding_phrases", event.target.value)}
                  placeholder={"Over the weekend, I...\nAfter that, I...\nI felt..."}
                />
                <small>One phrase per line.</small>
              </label>
              <label>
                Checklist
                <textarea
                  rows="5"
                  value={form.checklist}
                  disabled={isSubmitting}
                  onChange={(event) => updateField("checklist", event.target.value)}
                  placeholder={"Use past tense\nGive clear details\nSpeak for at least 60 seconds"}
                />
                <small>One checklist item per line.</small>
              </label>
            </div>
          </section>

          <section className="teacher-assign-submit">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Assigning task..." : "Assign Task"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={isSubmitting}
              onClick={resetForm}
            >
              Assign another task
            </button>
          </section>

          <SubmitStatus status={submitStatus} onAssignAnother={resetForm} />
        </form>
      )}
    </div>
  );
}
