import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { CalendarIcon } from "../icons.jsx";
import {
  assignDailyPlannerDraft,
  createDailyPlannerDraftsForStudent,
  dailyPlannerModes,
  formatDailyPlannerType,
  generateDailyPlannerGroups,
  getDailyPlannerDraftMissingFields,
  getDailyPlannerTaskCountGuard,
  getDailyPlannerStudents,
  getDailyPlannerStudentDefaults,
  isDailyPlannerWritingDraft,
  loadTuesdayJune23TaskPackGroups,
  tuesdayJune23PlannerDays,
  weekTwoStartDate
} from "../../lib/dailyTaskPlanner.js";
import { smartTaskTypes } from "../../lib/smartTaskBuilder.js";
import { isAdminLike } from "../../lib/rolePermissions.js";

function createPlannerForm() {
  return {
    date: weekTwoStartDate,
    dayNumber: "1",
    weeklyFocusOverride: "",
    mode: "all"
  };
}

function formatPlannerDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function PlannerState({ title, message }) {
  return (
    <section className="card teacher-assign-state" aria-labelledby="daily-planner-state-title">
      <div className="teacher-assign-state__icon" aria-hidden="true">
        <CalendarIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Daily Task Planner</p>
        <h2 id="daily-planner-state-title">{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function PlannerWorkflowHub({ profile }) {
  const actions = [
    {
      label: "Start planning",
      detail: "Generate editable drafts, approve them, then assign from this page.",
      href: "#daily-planner-controls-title",
      tone: "primary"
    },
    ...(profile?.role === "teacher"
      ? [
          {
            label: "View task history",
            detail: "Track assigned, submitted, and reviewed tasks after planning.",
            href: "/teacher/tasks"
          }
        ]
      : [])
  ];

  return (
    <section className="card planner-workflow-hub" aria-labelledby="planner-workflow-title">
      <div className="planner-workflow-hub__intro">
        <p className="card-eyebrow card-eyebrow--red">Task workflow</p>
        <h2 id="planner-workflow-title">Plan, review, edit, and assign from one place.</h2>
        <p>
          Daily Planner is the main task workspace. Generate the week, review each draft, and assign only when it is ready.
        </p>
      </div>

      <div className="planner-workflow-hub__actions">
        {actions.map((action) => (
          <a
            className={action.tone === "primary" ? "primary-button" : "secondary-button"}
            href={action.href}
            key={action.label}
          >
            <strong>{action.label}</strong>
            <span>{action.detail}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function StudentPlanSummary({ student, studentProfile, defaults }) {
  const items = [
    ["Goal", studentProfile?.main_goal],
    ["Speaking focus", studentProfile?.speaking_focus],
    ["Vocabulary", studentProfile?.vocabulary_focus],
    ["Default", defaults?.note]
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="daily-planner-student-summary">
      <div>
        <strong>{student.full_name || "Student"}</strong>
        <span>{student.email || "No email"}</span>
      </div>
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
        <p>No learning profile notes yet. The planner will use general practice defaults.</p>
      )}
    </div>
  );
}

function PlannerWeekTabs({ days, selectedDate, draftCountsByDate, onSelectDay, disabled }) {
  return (
    <div className="daily-planner-week-tabs" aria-label="Task pack week days">
      {days.map((day) => {
        const draftCount = draftCountsByDate.get(day.date) || 0;
        const isSelected = selectedDate === day.date;

        return (
          <button
            type="button"
            className={isSelected ? "is-selected" : ""}
            key={day.date}
            disabled={disabled}
            onClick={() => onSelectDay(day)}
          >
            <strong>{day.label}</strong>
            <span>{formatPlannerDate(day.date)} - Day {day.dayNumber}</span>
            <small>
              {draftCount
                ? `${draftCount} ready draft${draftCount === 1 ? "" : "s"}`
                : day.status === "ready"
                  ? "No matched drafts"
                  : "Planning slot"}
            </small>
          </button>
        );
      })}
    </div>
  );
}

function DraftPackSupportFields({ draft, disabled, onChange }) {
  if (!draft.source_pack_id) {
    return null;
  }

  return (
    <details className="daily-planner-pack-details">
      <summary>Advanced source notes</summary>
      <div className="teacher-task-form-grid daily-planner-draft-fields daily-planner-pack-fields">
        <label>
          Series title
          <input
            type="text"
            value={draft.series_title || ""}
            disabled={disabled}
            onChange={(event) => onChange("series_title", event.target.value)}
          />
        </label>
        <label>
          Topic key
          <input
            type="text"
            value={draft.topic_key || ""}
            disabled={disabled}
            onChange={(event) => onChange("topic_key", event.target.value)}
          />
        </label>
        <label>
          Scenario key
          <input
            type="text"
            value={draft.scenario_key || ""}
            disabled={disabled}
            onChange={(event) => onChange("scenario_key", event.target.value)}
          />
        </label>
        <label>
          Easy version
          <textarea
            rows="3"
            value={draft.easy_version || ""}
            disabled={disabled}
            onChange={(event) => onChange("easy_version", event.target.value)}
          />
        </label>
        <label>
          Extra challenge
          <textarea
            rows="3"
            value={draft.extra_challenge || ""}
            disabled={disabled}
            onChange={(event) => onChange("extra_challenge", event.target.value)}
          />
        </label>
        <label>
          Goal-based reminder
          <textarea
            rows="3"
            value={draft.goal_reminder || ""}
            disabled={disabled}
            onChange={(event) => onChange("goal_reminder", event.target.value)}
          />
        </label>
        <label>
          Repetition guard note
          <textarea
            rows="3"
            value={draft.repetition_guard_note || ""}
            disabled={disabled}
            onChange={(event) => onChange("repetition_guard_note", event.target.value)}
          />
        </label>
      </div>
      <p>These notes are preserved inside the assignment instructions because the task tables do not have separate columns for them.</p>
    </details>
  );
}

function DraftCompactSummary({ draft, isEditing, hasDuplicateWarning, disabled, onEditToggle }) {
  const isWriting = isDailyPlannerWritingDraft(draft);
  const typeLabel = isWriting ? "Writing" : formatDailyPlannerType(draft.task_type);

  return (
    <div className="daily-planner-draft-summary">
      <div className="daily-planner-draft-summary__meta" aria-label="Task summary">
        <span>{typeLabel}</span>
        <span>{draft.estimated_minutes || draft.min_words || "?"}{isWriting ? " words target" : " min"}</span>
        {draft.approved ? <span className="is-ready">Approved</span> : <span className="is-muted">Not approved</span>}
        {draft.status === "success" && <span className="is-ready">Assigned</span>}
        {hasDuplicateWarning && <span className="is-warning">Possible duplicate</span>}
      </div>
      {draft.focus && <p>{draft.focus}</p>}
      {draft.description && !isWriting && <small>{draft.description}</small>}
      {draft.prompt && isWriting && <small>{draft.prompt}</small>}
      <button
        className="text-button daily-planner-edit-toggle"
        type="button"
        disabled={disabled}
        onClick={onEditToggle}
        aria-expanded={isEditing}
      >
        {isEditing ? "Close edit" : "Edit"}
      </button>
    </div>
  );
}

function DraftEditor({ draft, disabled, onChange }) {
  const isWriting = isDailyPlannerWritingDraft(draft);

  if (isWriting) {
    return (
      <>
      <div className="teacher-task-form-grid daily-planner-draft-fields">
        <label>
          Task title
          <input
            type="text"
            value={draft.title || ""}
            disabled={disabled}
            onChange={(event) => onChange("title", event.target.value)}
          />
        </label>
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
            value={draft.instructions || ""}
            disabled={disabled}
            onChange={(event) => onChange("instructions", event.target.value)}
          />
        </label>
        <label>
          Estimated minutes
          <input
            type="number"
            min="1"
            value={draft.estimated_minutes || ""}
            disabled={disabled}
            onChange={(event) => onChange("estimated_minutes", event.target.value)}
          />
        </label>
        <label>
          Focus
          <input
            type="text"
            value={draft.focus || ""}
            disabled={disabled}
            onChange={(event) => onChange("focus", event.target.value)}
          />
        </label>
        <label>
          Level
          <input
            type="text"
            value={draft.level || ""}
            disabled={disabled}
            onChange={(event) => onChange("level", event.target.value)}
          />
        </label>
        <label>
          Due date
          <input
            type="date"
            value={draft.due_date || ""}
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
      </div>
      <DraftPackSupportFields draft={draft} disabled={disabled} onChange={onChange} />
      </>
    );
  }

  return (
    <>
    <div className="teacher-task-form-grid daily-planner-draft-fields">
      <label>
        Task title
        <input
          type="text"
          value={draft.title || ""}
          disabled={disabled}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </label>
      <label>
        Task type
        <select
          value={draft.task_type || "speaking"}
          disabled={disabled}
          onChange={(event) => onChange("task_type", event.target.value)}
        >
          {smartTaskTypes.map((type) => (
            <option value={type} key={type}>{formatDailyPlannerType(type)}</option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea
          rows="3"
          value={draft.description || ""}
          disabled={disabled}
          onChange={(event) => onChange("description", event.target.value)}
        />
      </label>
      <label>
        Instructions
        <textarea
          rows="4"
          value={draft.instructions || ""}
          disabled={disabled}
          onChange={(event) => onChange("instructions", event.target.value)}
        />
      </label>
      <label>
        Estimated minutes
        <input
          type="number"
          min="1"
          value={draft.estimated_minutes || "10"}
          disabled={disabled}
          onChange={(event) => onChange("estimated_minutes", event.target.value)}
        />
      </label>
      <label>
        Level
        <input
          type="text"
          value={draft.level || ""}
          disabled={disabled}
          onChange={(event) => onChange("level", event.target.value)}
        />
      </label>
      <label>
        Focus
        <input
          type="text"
          value={draft.focus || ""}
          disabled={disabled}
          onChange={(event) => onChange("focus", event.target.value)}
        />
      </label>
      <label>
        Due date
        <input
          type="date"
          value={draft.due_date || ""}
          disabled={disabled}
          onChange={(event) => onChange("due_date", event.target.value)}
        />
      </label>
      <label>
        Guiding phrases
        <textarea
          rows="4"
          value={draft.guiding_phrases || ""}
          disabled={disabled}
          onChange={(event) => onChange("guiding_phrases", event.target.value)}
        />
        <small>One phrase per line.</small>
      </label>
      <label>
        Checklist items
        <textarea
          rows="4"
          value={draft.checklist || ""}
          disabled={disabled}
          onChange={(event) => onChange("checklist", event.target.value)}
        />
        <small>One checklist item per line.</small>
      </label>
    </div>
    <DraftPackSupportFields draft={draft} disabled={disabled} onChange={onChange} />
    </>
  );
}

export function DailyTaskPlannerPage({ user, profile }) {
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [plannerForm, setPlannerForm] = useState(createPlannerForm);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssigningAll, setIsAssigningAll] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "", detail: "" });
  const [editingDraftIds, setEditingDraftIds] = useState([]);

  const isAllowedRole = profile?.role === "teacher" || isAdminLike(profile);
  const isBusy = isLoading || isGenerating || isAssigningAll || Boolean(busyDraftId);
  const approvedDraftCount = groups.reduce(
    (count, group) =>
      count + group.drafts.filter(
        (draft) => draft.approved && draft.status !== "success" && draft.due_date === plannerForm.date
      ).length,
    0
  );

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setIsLoading(true);
      setStatus({ type: "idle", message: "", detail: "" });

      const result = await getDailyPlannerStudents(profile);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setStatus({ type: "error", message: result.error, detail: "" });
        return;
      }

      setStudents(result.students);
      setSelectedStudentIds(result.students.map((student) => student.id));
    }

    if (isAllowedRole) {
      loadStudents();
    }

    return () => {
      isMounted = false;
    };
  }, [isAllowedRole, profile?.id, profile?.role]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [students, selectedStudentIds]
  );
  const draftCountsByDate = useMemo(() => {
    const counts = new Map();

    groups.forEach((group) => {
      group.drafts.forEach((draft) => {
        const dateKey = draft.due_date || draft.planner_date;

        if (dateKey) {
          counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
        }
      });
    });

    return counts;
  }, [groups]);
  const selectedPackDay = tuesdayJune23PlannerDays.find((day) => day.date === plannerForm.date);
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          drafts: group.drafts.filter(
            (draft) => (draft.due_date || draft.planner_date) === plannerForm.date
          )
        }))
        .filter((group) => group.drafts.length > 0),
    [groups, plannerForm.date]
  );
  const visibleDrafts = useMemo(
    () => visibleGroups.flatMap((group) => group.drafts),
    [visibleGroups]
  );
  const selectedDaySummary = useMemo(() => {
    const approved = visibleDrafts.filter((draft) => draft.approved && draft.status !== "success").length;
    const assigned = visibleDrafts.filter((draft) => draft.status === "success").length;
    const duplicateWarnings = visibleDrafts.filter((draft) => draft.duplicateWarnings?.length).length;

    return {
      total: visibleDrafts.length,
      approved,
      assigned,
      duplicateWarnings
    };
  }, [visibleDrafts]);

  function updatePlannerField(field, value) {
    setStatus({ type: "idle", message: "", detail: "" });
    setPlannerForm((current) => ({ ...current, [field]: value }));
  }

  function selectPlannerDay(day) {
    setStatus({ type: "idle", message: "", detail: "" });
    setPlannerForm((current) => ({
      ...current,
      date: day.date,
      dayNumber: day.dayNumber || current.dayNumber
    }));
  }

  function toggleStudent(studentId) {
    setStatus({ type: "idle", message: "", detail: "" });
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function toggleDraftEdit(draftId) {
    setEditingDraftIds((current) =>
      current.includes(draftId)
        ? current.filter((id) => id !== draftId)
        : [...current, draftId]
    );
  }

  function validatePlanner() {
    if (!plannerForm.date || Number.isNaN(new Date(`${plannerForm.date}T00:00:00`).getTime())) {
      return "Choose a valid date.";
    }

    if (!selectedStudentIds.length) {
      return "Choose at least one student.";
    }

    if (!Number.isFinite(Number(plannerForm.dayNumber)) || Number(plannerForm.dayNumber) < 1) {
      return "Day number must be 1 or higher.";
    }

    return "";
  }

  async function handleGenerateDailyPlan() {
    const validationError = validatePlanner();

    if (validationError) {
      setStatus({ type: "error", message: validationError, detail: "" });
      return;
    }

    setIsGenerating(true);
    setStatus({
      type: "submitting",
      message: "Generating selected day's tasks...",
      detail: ""
    });

    const result = await generateDailyPlannerGroups({
      students,
      selectedStudentIds,
      date: plannerForm.date,
      planScope: "day",
      dayNumber: plannerForm.dayNumber,
      weeklyFocusOverride: plannerForm.weeklyFocusOverride,
      mode: plannerForm.mode,
      currentGroups: groups
    });

    if (result.blockError) {
      setGroups([]);
      setIsGenerating(false);
      setStatus({
        type: "error",
        message: result.blockError,
        detail: "Narrow the selection or regenerate the selected date only."
      });
      return;
    }

    if (result.draftCount > 30) {
      const shouldContinue = window.confirm(
        "You are about to create more than 30 tasks for one day. Continue?"
      );

      if (!shouldContinue) {
        setIsGenerating(false);
        setStatus({
          type: "error",
          message: "Daily generation cancelled.",
          detail: "Narrow the student selection before generating again."
        });
        return;
      }
    }

    setGroups(result.groups);
    setIsGenerating(false);
    setStatus({
      type: result.warningError ? "error" : "success",
      message: result.groups.length
        ? `Generated ${result.draftCount} draft${result.draftCount === 1 ? "" : "s"} for ${plannerForm.date}.`
        : "No drafts were generated.",
      detail: result.warningError || "Review, edit, approve, then assign. Nothing is assigned until you approve it."
    });
  }

  async function handleLoadTuesdayJune23Pack() {
    setIsGenerating(true);
    setStatus({
      type: "submitting",
      message: "Loading Tuesday-Sunday task pack...",
      detail: ""
    });

    const result = await loadTuesdayJune23TaskPackGroups({
      students,
      currentGroups: groups
    });
    const matchedIds = result.groups.map((group) => group.student.id);
    const detailParts = [
      `Source provided ${result.sourceCount} task card${result.sourceCount === 1 ? "" : "s"}; expected ${result.expectedTaskCount}.`,
      "Imported Tuesday-Sunday drafts are approved by default so teachers can assign faster. Review, edit, or unapprove before assigning if needed.",
      "Each day in the pack contains one speaking task for each matched student."
    ];

    if (result.missingStudents.length) {
      detailParts.push(`Missing student matches: ${result.missingStudents.join(", ")}.`);
    }

    if (result.ambiguousStudents.length) {
      detailParts.push(
        `Ambiguous student matches: ${result.ambiguousStudents
          .map((item) => `${item.studentName} (${item.matches.join(", ")})`)
          .join("; ")}.`
      );
    }

    if (result.incompleteTasks.length) {
      detailParts.push(
        `Incomplete source cards: ${result.incompleteTasks
          .map((item) => `${item.studentName} - ${item.missingFields.join(", ")}`)
          .join("; ")}.`
      );
    }

    if (result.warningError) {
      detailParts.push(result.warningError);
    }

    setPlannerForm((current) => ({
      ...current,
      date: "2026-06-23",
      dayNumber: "1",
      mode: "all"
    }));
    setSelectedStudentIds([...new Set(matchedIds)]);
    setGroups(result.groups);
    setIsGenerating(false);
    setStatus({
      type:
        result.warningError ||
        result.missingStudents.length ||
        result.ambiguousStudents.length ||
        result.incompleteTasks.length ||
        result.sourceCount !== result.expectedTaskCount
          ? "error"
          : "success",
      message: result.draftCount
        ? `Loaded ${result.draftCount} editable Tuesday-Sunday draft${result.draftCount === 1 ? "" : "s"}.`
        : "No Tuesday-Sunday drafts were loaded.",
      detail: detailParts.join(" ")
    });
  }

  function updateDraftState(studentId, draftId, updater) {
    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.student.id === studentId
          ? {
              ...group,
              drafts: group.drafts.map((draft) =>
                draft.planner_id === draftId
                  ? typeof updater === "function"
                    ? updater(draft)
                    : { ...draft, ...updater }
                  : draft
              )
            }
          : group
      )
    );
  }

  function updateDraftField(studentId, draftId, field, value) {
    setStatus({ type: "idle", message: "", detail: "" });
    updateDraftState(studentId, draftId, (draft) => {
      if (field === "task_type" && value === "writing") {
        return {
          ...draft,
          draft_type: "writing",
          task_type: "writing",
          prompt: draft.prompt || draft.description || "",
          min_words: draft.min_words || "80",
          estimated_minutes: "",
          status: "idle",
          statusMessage: ""
        };
      }

      if (field === "task_type") {
        return {
          ...draft,
          draft_type: "task",
          task_type: value,
          description: draft.description || draft.prompt || "",
          estimated_minutes: draft.estimated_minutes || "10",
          status: "idle",
          statusMessage: ""
        };
      }

      return {
        ...draft,
        [field]: value,
        status: "idle",
        statusMessage: ""
      };
    });
  }

  function regenerateDraft(group, draftIndex) {
    const currentDraft = group.drafts[draftIndex];
    const excludedTopicFamilies = new Set(
      group.drafts
        .filter((draft) => draft.planner_id !== currentDraft.planner_id)
        .map((draft) => draft.topic_family)
        .filter(Boolean)
    );
    const regeneratedDrafts = createDailyPlannerDraftsForStudent({
      student: group.student,
      date: currentDraft.due_date || plannerForm.date,
      dayNumber: currentDraft.planner_day_number || plannerForm.dayNumber,
      weeklyFocusOverride: plannerForm.weeklyFocusOverride,
      variantOffset: Number(currentDraft.regeneration_count || 0) + 1,
      excludedTopicFamilies
    });
    const nextDraft =
      regeneratedDrafts.find((draft) => draft.draft_type === currentDraft.draft_type) ||
      regeneratedDrafts[draftIndex] ||
      regeneratedDrafts[0];

    if (!nextDraft) {
      setStatus({ type: "error", message: "Could not regenerate this draft.", detail: "" });
      return;
    }

    setStatus({ type: "success", message: "Draft regenerated.", detail: "Review it before assigning." });
    updateDraftState(group.student.id, group.drafts[draftIndex].planner_id, {
      ...nextDraft,
      approved: true,
      status: "idle",
      statusMessage: ""
    });
  }

  function validateDraft(draft) {
    const packMissingFields = getDailyPlannerDraftMissingFields(draft);

    if (packMissingFields.length) {
      return `Complete source pack fields before assigning: ${packMissingFields.join(", ")}.`;
    }

    if (draft.source_pack_id && draft.duplicateWarnings?.length) {
      return "This imported source-pack draft matches existing task history. Skip it or change the topic before assigning.";
    }

    if (!draft.title?.trim()) {
      return "Task title is required.";
    }

    if (isDailyPlannerWritingDraft(draft)) {
      if (!draft.prompt?.trim()) {
        return "Writing prompt is required.";
      }

      if (!Number.isFinite(Number(draft.min_words)) || Number(draft.min_words) <= 0) {
        return "Minimum words must be positive.";
      }

      return "";
    }

    if (!draft.task_type) {
      return "Task type is required.";
    }

    if (!Number.isFinite(Number(draft.estimated_minutes)) || Number(draft.estimated_minutes) <= 0) {
      return "Estimated minutes must be positive.";
    }

    return "";
  }

  async function assignOneDraft(group, draft, options = {}) {
    if (draft.due_date !== plannerForm.date) {
      updateDraftState(group.student.id, draft.planner_id, {
        status: "error",
        statusMessage: "This draft is not for the selected date. Generate today's tasks again."
      });
      return false;
    }

    const validationError = validateDraft(draft);

    if (validationError) {
      updateDraftState(group.student.id, draft.planner_id, {
        status: "error",
        statusMessage: validationError
      });
      return false;
    }

    if (!options.skipDuplicateConfirmation && draft.duplicateWarnings?.length) {
      const shouldContinue = window.confirm(
        "Similar task detected. Regenerate with a new topic unless you intentionally want to assign this draft. Continue?"
      );

      if (!shouldContinue) {
        updateDraftState(group.student.id, draft.planner_id, {
          status: "idle",
          statusMessage: "Assignment skipped. Regenerate with a new topic if needed."
        });
        return false;
      }
    }

    setBusyDraftId(draft.planner_id);
    updateDraftState(group.student.id, draft.planner_id, {
      status: "submitting",
      statusMessage: "Assigning..."
    });

    const result = await assignDailyPlannerDraft({
      profile,
      student: group.student,
      draft
    });

    setBusyDraftId("");

    if (result.error) {
      updateDraftState(group.student.id, draft.planner_id, {
        status: "error",
        statusMessage: result.error
      });
      return false;
    }

    updateDraftState(group.student.id, draft.planner_id, {
      status: "success",
      statusMessage: isDailyPlannerWritingDraft(draft)
        ? "Writing task assigned."
        : "Task assigned."
    });
    return true;
  }

  async function handleAssignAllApproved() {
    if (!approvedDraftCount) {
      setStatus({ type: "error", message: "Approve at least one unassigned draft first.", detail: "" });
      return;
    }

    const guardMessage = getDailyPlannerTaskCountGuard({
      students,
      selectedStudentIds,
      date: plannerForm.date,
      draftCount: approvedDraftCount
    });

    if (guardMessage) {
      setStatus({
        type: "error",
        message: guardMessage,
        detail: "Assign only one approved task per selected student for this date."
      });
      return;
    }

    if (approvedDraftCount > 30) {
      const shouldContinue = window.confirm(
        "You are about to create more than 30 tasks for one day. Continue?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    const duplicateDraftCount = groups.reduce(
      (count, group) =>
        count + group.drafts.filter(
          (draft) =>
            draft.approved &&
            draft.status !== "success" &&
            draft.due_date === plannerForm.date &&
            draft.duplicateWarnings?.length
        ).length,
      0
    );

    if (duplicateDraftCount > 0) {
      const shouldContinue = window.confirm(
        "Similar task detected. Regenerate with a new topic unless you intentionally want to assign these drafts. Continue?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    setIsAssigningAll(true);
    setStatus({ type: "submitting", message: "Assigning approved drafts...", detail: "" });

    let successCount = 0;
    let errorCount = 0;

    for (const group of groups) {
      for (const draft of group.drafts) {
        if (!draft.approved || draft.status === "success" || draft.due_date !== plannerForm.date) {
          continue;
        }

        const success = await assignOneDraft(group, draft, { skipDuplicateConfirmation: true });

        if (success) {
          successCount += 1;
        } else {
          errorCount += 1;
        }
      }
    }

    setIsAssigningAll(false);
    setStatus({
      type: errorCount ? "error" : "success",
      message: errorCount
        ? `${successCount} draft${successCount === 1 ? "" : "s"} assigned, ${errorCount} need attention.`
        : `${successCount} approved draft${successCount === 1 ? "" : "s"} assigned successfully.`,
      detail: "Check each student section for per-task status."
    });
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-assign-page daily-planner-page">
        <Header user={user} title="Daily Task Planner" subtitle="Plan homework for multiple students." />
        <PlannerState
          title="Daily Task Planner is only available for teacher, coordinator, and admin accounts."
          message="Students receive approved tasks on their Practice and Writing pages."
        />
      </div>
    );
  }

  if (!isAllowedRole) {
    return (
      <div className="teacher-assign-page daily-planner-page">
        <Header user={user} title="Daily Task Planner" subtitle="Plan homework for multiple students." />
        <PlannerState
          title="Sign in with a teacher, coordinator, or admin account."
          message="This planner creates editable homework drafts for students."
        />
      </div>
    );
  }

  return (
    <div className="teacher-assign-page daily-planner-page">
      <Header
        user={user}
        title="Daily Task Planner"
        subtitle="Plan, review, edit, and assign student tasks from one place."
      />

      <PlannerWorkflowHub profile={profile} />

      {isLoading ? (
        <PlannerState title="Loading students..." message="Please wait while we open the student list." />
      ) : !students.length ? (
        <PlannerState
          title={profile.role === "teacher" ? "No assigned students yet." : "No students found."}
          message={
            profile.role === "teacher"
              ? "Once students are linked to your teacher account, you can plan daily homework here."
              : "Create or connect student profiles before using Daily Task Planner."
          }
        />
      ) : (
        <>
          <section className="card teacher-assign-card daily-planner-control-card" aria-labelledby="daily-planner-controls-title">
            <div className="teacher-assign-card__header">
              <p className="card-eyebrow card-eyebrow--red">Planner inputs</p>
              <h2 id="daily-planner-controls-title">Build the selected homework plan</h2>
            </div>

            <PlannerWeekTabs
              days={tuesdayJune23PlannerDays}
              selectedDate={plannerForm.date}
              draftCountsByDate={draftCountsByDate}
              onSelectDay={selectPlannerDay}
              disabled={isBusy}
            />

            {selectedPackDay && (
              <div className="daily-planner-week-note" role="status">
                <strong>{selectedPackDay.label} task pack status</strong>
                <span>{selectedPackDay.note}</span>
              </div>
            )}

            <div className="daily-planner-control-grid">
              <div className="teacher-task-form-grid">
                <label>
                  Date
                  <input
                    type="date"
                    value={plannerForm.date}
                    disabled={isBusy}
                    onChange={(event) => updatePlannerField("date", event.target.value)}
                  />
                </label>
                <label>
                  Fallback day number
                  <input
                    type="number"
                    min="1"
                    value={plannerForm.dayNumber}
                    disabled={isBusy}
                    onChange={(event) => updatePlannerField("dayNumber", event.target.value)}
                  />
                  <small>Week 2 automatically maps Jun 15-21 to Day 8-14 for old students and Day 1-7 for new students.</small>
                </label>
                <label>
                  Generate mode
                  <select
                    value={plannerForm.mode}
                    disabled={isBusy}
                    onChange={(event) => updatePlannerField("mode", event.target.value)}
                  >
                    {dailyPlannerModes.map((mode) => (
                      <option value={mode.value} key={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Weekly focus override
                  <input
                    type="text"
                    value={plannerForm.weeklyFocusOverride}
                    disabled={isBusy}
                    onChange={(event) => updatePlannerField("weeklyFocusOverride", event.target.value)}
                    placeholder="Optional shared focus for this date"
                  />
                </label>
              </div>

              <div className="daily-planner-student-picker">
                <div className="daily-planner-student-picker__header">
                  <div>
                    <strong>Select students</strong>
                    <span>{selectedStudents.length} of {students.length} selected</span>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="text-button"
                      disabled={isBusy}
                      onClick={() => setSelectedStudentIds(students.map((student) => student.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      disabled={isBusy}
                      onClick={() => setSelectedStudentIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="daily-planner-student-options">
                  {students.map((student) => {
                    const defaults = getDailyPlannerStudentDefaults(student);
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <label className={isSelected ? "is-selected" : ""} key={student.id}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isBusy}
                          onChange={() => toggleStudent(student.id)}
                        />
                        <span>{student.full_name || student.email || "Student"}</span>
                        <small>{defaults.numberOfTasks} task{defaults.numberOfTasks === 1 ? "" : "s"} - {defaults.note}</small>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="teacher-assign-submit daily-planner-actions">
              <button className="primary-button" type="button" disabled={isBusy} onClick={handleGenerateDailyPlan}>
                {isGenerating ? "Generating..." : "Generate Selected Day"}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isBusy}
                onClick={handleLoadTuesdayJune23Pack}
              >
                Load Tuesday-Sunday Pack
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={isBusy || !groups.length}
                onClick={handleAssignAllApproved}
              >
                {isAssigningAll ? "Assigning..." : `Assign Selected Day (${approvedDraftCount})`}
              </button>
            </div>
            <p className="teacher-assign-card__note">
              Generates one unique task per selected student for the selected date only. The Tuesday-Sunday pack loads imported source cards for each day.
            </p>
            <p className="teacher-assign-card__note">
              The planner creates editable drafts only. Imported pack drafts are ready by default, but tasks are not assigned until you click assign.
            </p>
          </section>

          {status.message && (
            <div className={`teacher-assign-message teacher-assign-message--${status.type}`}>
              <p>{status.message}</p>
              {status.detail && <span>{status.detail}</span>}
            </div>
          )}

          {groups.length > 0 && visibleGroups.length === 0 && (
            <PlannerState
              title={`No drafts for ${formatPlannerDate(plannerForm.date)} yet.`}
              message="Load the Tuesday-Sunday pack or generate selected-day drafts when you are ready to plan this date."
            />
          )}

          {visibleGroups.length > 0 && (
            <section className="daily-planner-groups" aria-label="Generated daily plan">
              <div className="card daily-planner-selected-day-summary" role="status">
                <div>
                  <p className="card-eyebrow card-eyebrow--red">Selected day</p>
                  <h2>
                    {selectedPackDay?.label || "Selected date"} {formatPlannerDate(plannerForm.date)}
                    {plannerForm.dayNumber ? ` - Day ${plannerForm.dayNumber}` : ""}
                  </h2>
                  <p>
                    Showing {selectedDaySummary.total} ready draft{selectedDaySummary.total === 1 ? "" : "s"} for this day only.
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Ready drafts</dt>
                    <dd>{selectedDaySummary.total}</dd>
                  </div>
                  <div>
                    <dt>Approved</dt>
                    <dd>{selectedDaySummary.approved}</dd>
                  </div>
                  <div>
                    <dt>Assigned</dt>
                    <dd>{selectedDaySummary.assigned}</dd>
                  </div>
                  <div>
                    <dt>Warnings</dt>
                    <dd>{selectedDaySummary.duplicateWarnings}</dd>
                  </div>
                </dl>
                {selectedDaySummary.duplicateWarnings > 0 && (
                  <p className="daily-planner-selected-day-summary__warning">
                    {selectedDaySummary.duplicateWarnings} draft{selectedDaySummary.duplicateWarnings === 1 ? "" : "s"} may duplicate existing assigned work. Review marked cards before assigning.
                  </p>
                )}
              </div>
              {visibleGroups.map((group) => (
                <article className="card daily-planner-student-group" key={group.student.id}>
                  <div className="daily-planner-student-group__header">
                    <StudentPlanSummary
                      student={group.student}
                      studentProfile={group.studentProfile}
                      defaults={group.defaults}
                    />
                  </div>

                  <div className="daily-planner-draft-list">
                    {group.drafts.map((draft, draftIndex) => {
                      const isWriting = isDailyPlannerWritingDraft(draft);
                      const isDraftBusy = busyDraftId === draft.planner_id || isAssigningAll;
                      const isEditing = editingDraftIds.includes(draft.planner_id);
                      const hasDuplicateWarning = Boolean(draft.duplicateWarnings?.length);

                      return (
                        <section className="daily-planner-draft-card" key={draft.planner_id}>
                          <div className="daily-planner-draft-card__top">
                            <div>
                              <p className="card-eyebrow card-eyebrow--red">
                                {formatPlannerDate(draft.planner_date || draft.due_date)} - Day {draft.planner_day_number || "?"} - {isWriting ? "Writing" : formatDailyPlannerType(draft.task_type)}
                              </p>
                              <h3>{draft.title || "Untitled draft"}</h3>
                              {draft.source_pack_id && (
                                <small className="daily-planner-topic-key">
                                  Source pack: {draft.source_pack_student_name || group.student.full_name || "Student"}
                                  {draft.series_title ? ` - ${draft.series_title}` : ""}
                                </small>
                              )}
                            </div>
                            <label className="daily-planner-approval-toggle">
                              <input
                                type="checkbox"
                                checked={Boolean(draft.approved)}
                                disabled={isBusy}
                                onChange={(event) =>
                                  updateDraftState(group.student.id, draft.planner_id, {
                                    approved: event.target.checked,
                                    status: event.target.checked ? draft.status : "idle",
                                    statusMessage: event.target.checked ? draft.statusMessage : "Rejected for now."
                                  })
                                }
                              />
                              Approve
                            </label>
                          </div>

                          <DraftCompactSummary
                            draft={draft}
                            isEditing={isEditing}
                            hasDuplicateWarning={hasDuplicateWarning}
                            disabled={isBusy}
                            onEditToggle={() => toggleDraftEdit(draft.planner_id)}
                          />

                          {isEditing && (
                            <DraftEditor
                              draft={draft}
                              disabled={isBusy || !draft.approved || draft.status === "success"}
                              onChange={(field, value) => updateDraftField(group.student.id, draft.planner_id, field, value)}
                            />
                          )}

                          {hasDuplicateWarning && (
                            <details className="daily-planner-warning daily-planner-warning--draft">
                              <summary>Possible duplicate</summary>
                              {draft.duplicateWarnings.map((warning) => (
                                <span key={warning}>{warning}</span>
                              ))}
                            </details>
                          )}

                          <div className="daily-planner-draft-card__actions">
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isBusy}
                              onClick={() => regenerateDraft(group, draftIndex)}
                            >
                              Regenerate this draft
                            </button>
                            <button
                              className="primary-button"
                              type="button"
                              disabled={isDraftBusy || !draft.approved || draft.status === "success"}
                              onClick={() => assignOneDraft(group, draft)}
                            >
                              {draft.status === "success" ? "Assigned" : isDraftBusy ? "Assigning..." : "Assign this draft"}
                            </button>
                          </div>

                          {draft.statusMessage && (
                            <div className={`daily-planner-draft-status daily-planner-draft-status--${draft.status}`}>
                              {draft.statusMessage}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
