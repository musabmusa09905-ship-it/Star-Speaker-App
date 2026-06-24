import { useEffect, useState } from "react";
import { Header } from "../Header.jsx";
import { BellIcon, ClockIcon, FeedbackIcon, ProfileIcon, TargetIcon } from "../icons.jsx";
import {
  getDailyReminderDashboard,
  markDailyRemindersManually,
  markDailyReminderManually,
  markDailyReminderOpened
} from "../../lib/dailyReminders.js";

function formatDate(value) {
  if (!value) {
    return "Today";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00+03:00`));
}

function formatTime(value) {
  if (!value) {
    return "Today";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function DailyReminderState({ title, message, action }) {
  return (
    <section className="card daily-reminders-state" aria-labelledby="daily-reminders-state-title">
      <div className="daily-reminders-state__icon" aria-hidden="true">
        <BellIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Daily Reminders</p>
        <h2 id="daily-reminders-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function SummaryCards({ stats }) {
  const cards = [
    {
      label: "Total active students",
      value: stats.totalActiveStudents,
      icon: <ProfileIcon />
    },
    {
      label: "Completed today",
      value: stats.completedToday,
      icon: <TargetIcon />
    },
    {
      label: "Needs reminder",
      value: stats.needsReminder,
      icon: <BellIcon />
    },
    {
      label: "Already handled today",
      value: stats.alreadyMessagedToday,
      icon: <FeedbackIcon />
    },
    {
      label: "Completion percentage",
      value: `${stats.completionPercentage}%`,
      icon: <ClockIcon />
    }
  ];

  return (
    <section className="daily-reminder-stats" aria-label="Daily reminder summary">
      {cards.map((card) => (
        <article className="card daily-reminder-stat" key={card.label}>
          <div aria-hidden="true">{card.icon}</div>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

function MessagePreview({ title, message }) {
  return (
    <div className="daily-reminder-preview">
      <span>{title}</span>
      <pre>{message}</pre>
    </div>
  );
}

function ContactMeta({ row }) {
  return (
    <div className="daily-reminder-meta">
      <span>{row.email || "Email unavailable"}</span>
      <span>{row.phone || "WhatsApp number unavailable"}</span>
      <span className={`daily-reminder-whatsapp-chip is-${row.whatsapp?.tone || "warning"}`}>
        {row.whatsapp?.label || "WhatsApp number unavailable"}
      </span>
      <span>{row.missingStatus}</span>
    </div>
  );
}

function PersonalizationMeta({ row }) {
  return (
    <div className="daily-reminder-personalization">
      <span className={row.isPersonalizedReminder ? "is-personalized" : ""}>
        {row.isPersonalizedReminder ? "Personalized" : "Teacher voice only"}
      </span>
      {row.motivationGoal && <span>Goal: {row.motivationGoal}</span>}
      <a className="text-button" href={row.motivationEditHref || "/teacher/students"}>
        Edit motivation profile
      </a>
    </div>
  );
}

function isReminderEligible(row) {
  return !row.alreadyMessagedToday;
}

function isEncouragementEligible(row) {
  return !row.alreadyEncouragedToday;
}

function isWhatsappReminderReady(row) {
  return Boolean(row.whatsapp?.canUse && !row.hasWhatsappReminderLog);
}

function isWhatsappEncouragementReady(row) {
  return Boolean(row.whatsapp?.canUse && !row.hasWhatsappEncouragementLog);
}

function getReminderSlotForKind(kind) {
  return kind === "encouragement" ? "completed_encouragement" : "whatsapp_daily";
}

function getWhatsappMessage(row, kind) {
  return kind === "encouragement"
    ? row.previews.encouragement
    : row.previews.whatsappReminder;
}

function getWhatsappLink(row, kind) {
  return kind === "encouragement"
    ? row.whatsapp?.encouragementLink
    : row.whatsapp?.reminderLink;
}

function getSelectedEligibleRows(rows, selectedIds, isEligible) {
  const selectedSet = new Set(selectedIds);
  return rows.filter((row) => selectedSet.has(row.student.id) && isEligible(row));
}

function getUnavailableWhatsAppCounts(rows, kind) {
  const isEncouragement = kind === "encouragement";
  const hasDuplicate = (row) => isEncouragement ? row.hasWhatsappEncouragementLog : row.hasWhatsappReminderLog;

  return rows.reduce(
    (counts, row) => {
      if (row.whatsapp?.canUse && hasDuplicate(row)) {
        counts.duplicateSkipped += 1;
        return counts;
      }

      if (row.whatsapp?.canUse) {
        return counts;
      }

      const label = row.whatsapp?.label || "";

      if (label.includes("Missing WhatsApp number")) {
        counts.missingNumber += 1;
      } else if (label.includes("Invalid WhatsApp number")) {
        counts.invalidNumber += 1;
      } else if (label.includes("Opt-in missing")) {
        counts.optInMissing += 1;
      } else {
        counts.unavailable += 1;
      }

      return counts;
    },
    {
      missingNumber: 0,
      invalidNumber: 0,
      optInMissing: 0,
      unavailable: 0,
      duplicateSkipped: 0
    }
  );
}

function BulkActionBar({
  title,
  eligibleCount,
  selectedCount,
  whatsappReadyCount,
  disabled,
  selectedLabel,
  allLabel,
  whatsappLabel,
  onSelectAll,
  onSelectWhatsappReady,
  onClear,
  onSelected,
  onAll,
  onCopyWhatsappMessages,
  onPrepareWhatsappQueue
}) {
  return (
    <div className="daily-reminder-bulk-bar" aria-label={title}>
      <div>
        <strong>{title}</strong>
        <span>
          {selectedCount} selected of {eligibleCount} eligible
          {typeof whatsappReadyCount === "number" ? ` · ${whatsappReadyCount} WhatsApp-ready` : ""}
        </span>
      </div>
      <div>
        <button className="secondary-button" type="button" disabled={disabled || !eligibleCount} onClick={onSelectAll}>
          Select all
        </button>
        {onSelectWhatsappReady && (
          <button className="secondary-button" type="button" disabled={disabled || !whatsappReadyCount} onClick={onSelectWhatsappReady}>
            Select WhatsApp-ready
          </button>
        )}
        <button className="secondary-button" type="button" disabled={disabled || !selectedCount} onClick={onClear}>
          Clear selection
        </button>
        <button className="primary-button" type="button" disabled={disabled || !selectedCount} onClick={onSelected}>
          {selectedLabel}
        </button>
        {onCopyWhatsappMessages && (
          <button className="secondary-button" type="button" disabled={disabled || !selectedCount} onClick={onCopyWhatsappMessages}>
            Copy WhatsApp messages
          </button>
        )}
        {onPrepareWhatsappQueue && (
          <button className="secondary-button" type="button" disabled={disabled || !selectedCount} onClick={onPrepareWhatsappQueue}>
            {whatsappLabel || "Prepare WhatsApp queue"}
          </button>
        )}
        <button className="secondary-button" type="button" disabled={disabled || !eligibleCount} onClick={onAll}>
          {allLabel}
        </button>
      </div>
    </div>
  );
}

function BulkConfirmationModal({ confirmation, isBusy, onCancel, onConfirm }) {
  if (!confirmation) {
    return null;
  }

  return (
    <div className="daily-reminder-modal-backdrop" role="presentation">
      <section className="daily-reminder-confirmation" role="dialog" aria-modal="true" aria-labelledby="daily-reminder-confirm-title">
        <div className="daily-reminder-confirmation__icon" aria-hidden="true">
          <BellIcon />
        </div>
        <div>
          <h2 id="daily-reminder-confirm-title">{confirmation.title}</h2>
          <p>{confirmation.body}</p>
          <span>{confirmation.count} students selected.</span>
        </div>
        <div className="daily-reminder-confirmation__actions">
          <button className="secondary-button" type="button" disabled={isBusy} onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="button" disabled={isBusy} onClick={onConfirm}>
            {isBusy ? "Working..." : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

function WhatsAppQueueModal({
  queue,
  isBusy,
  onClose,
  onOpen,
  onCopy,
  onSkip,
  onNext
}) {
  if (!queue) {
    return null;
  }

  const currentRow = queue.rows[queue.index] || null;
  const isComplete = !currentRow;
  const progressText = queue.rows.length
    ? `Student ${Math.min(queue.index + 1, queue.rows.length)} of ${queue.rows.length}`
    : "Queue complete";
  const message = currentRow ? getWhatsappMessage(currentRow, queue.kind) : "";

  return (
    <div className="daily-reminder-modal-backdrop" role="presentation">
      <section className="daily-reminder-confirmation daily-reminder-whatsapp-queue" role="dialog" aria-modal="true" aria-labelledby="daily-reminder-whatsapp-queue-title">
        <div className="daily-reminder-confirmation__icon" aria-hidden="true">
          <BellIcon />
        </div>

        {isComplete ? (
          <>
            <div>
              <h2 id="daily-reminder-whatsapp-queue-title">WhatsApp queue complete</h2>
              <p>
                Opened and handled {queue.handled}, skipped {queue.skipped}.
              </p>
              <span>
                {queue.missingNumber} missing number, {queue.invalidNumber} invalid number, {queue.optInMissing} opt-in missing, {queue.unavailable} unavailable. {queue.duplicateSkipped} already handled today.
              </span>
            </div>
            <div className="daily-reminder-confirmation__actions">
              <button className="primary-button" type="button" onClick={onClose}>
                Close and refresh
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="card-eyebrow card-eyebrow--red">{progressText}</p>
              <h2 id="daily-reminder-whatsapp-queue-title">{currentRow.studentName}</h2>
              <p>{currentRow.whatsapp?.number || "WhatsApp number unavailable"}</p>
              {currentRow.motivationGoal && <p>Goal: {currentRow.motivationGoal}</p>}
              <span>{currentRow.isPersonalizedReminder ? "Personalized reminder" : "Teacher voice only"}</span>
              <span>Opening WhatsApp will mark this item as handled. The app does not confirm it was sent.</span>
            </div>

            <MessagePreview
              title={queue.kind === "encouragement" ? "WhatsApp encouragement" : "WhatsApp reminder"}
              message={message}
            />

            <div className="daily-reminder-confirmation__actions daily-reminder-whatsapp-queue__actions">
              <button className="primary-button" type="button" disabled={isBusy} onClick={() => onOpen(currentRow, queue.kind)}>
                Open WhatsApp & mark handled
              </button>
              <button className="secondary-button" type="button" disabled={isBusy} onClick={() => onCopy(message)}>
                Copy message
              </button>
              <button className="secondary-button" type="button" disabled={isBusy} onClick={onSkip}>
                Skip
              </button>
              <button className="text-button" type="button" disabled={isBusy} onClick={onNext}>
                Next
              </button>
              <button className="text-button" type="button" disabled={isBusy} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function NeedsReminderCard({
  row,
  isSelected,
  isSelectable,
  isManualLoggingDisabled,
  isBusy,
  onCopy,
  onOpenWhatsapp,
  onMark,
  onToggleSelected
}) {
  const whatsappButtonText = row.hasWhatsappReminderLog
    ? "WhatsApp opened today"
    : "Open WhatsApp & mark handled";

  return (
    <article className="card daily-reminder-card">
      <div className="daily-reminder-card__header">
        <label className="daily-reminder-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!isSelectable || isBusy}
            onChange={() => onToggleSelected(row.student.id)}
          />
          <span>Select {row.studentName}</span>
        </label>
        <div>
          <p className="card-eyebrow card-eyebrow--red">Needs Reminder</p>
          <h2>{row.studentName}</h2>
          <ContactMeta row={row} />
          <PersonalizationMeta row={row} />
        </div>
        <span className={`daily-reminder-status ${row.alreadyMessagedToday ? "is-done" : row.messageStatus === "Missing contact info" ? "is-warning" : ""}`}>
          {row.messageStatus}
        </span>
      </div>

      <div className="daily-reminder-preview-grid">
        <MessagePreview title="Email preview" message={row.previews.emailReminder} />
        <MessagePreview title="WhatsApp preview" message={row.previews.whatsappReminder} />
      </div>

      <div className="daily-reminder-actions">
        <button className="secondary-button" type="button" onClick={() => onCopy(row.previews.emailReminder)}>
          Copy email
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!row.whatsapp?.canUse || isBusy || row.alreadyMessagedToday}
          onClick={() => onOpenWhatsapp(row, "reminder")}
        >
          {whatsappButtonText}
        </button>
        <button className="secondary-button" type="button" disabled={!row.whatsapp?.canUse || isBusy} onClick={() => onCopy(row.previews.whatsappReminder)}>
          Copy WhatsApp
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={isManualLoggingDisabled || isBusy || row.alreadyMessagedToday}
          onClick={() => onMark(row, "manual_missing", "manual", row.previews.emailReminder)}
        >
          {row.alreadyMessagedToday ? "Handled today" : "Mark handled"}
        </button>
      </div>
    </article>
  );
}

function CompletedTodayCard({
  row,
  isSelected,
  isSelectable,
  isManualLoggingDisabled,
  isBusy,
  onCopy,
  onOpenWhatsapp,
  onMark,
  onToggleSelected
}) {
  const whatsappButtonText = row.hasWhatsappEncouragementLog
    ? "WhatsApp encouragement opened today"
    : "Open WhatsApp encouragement & mark handled";

  return (
    <article className="card daily-reminder-card">
      <div className="daily-reminder-card__header">
        <label className="daily-reminder-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!isSelectable || isBusy}
            onChange={() => onToggleSelected(row.student.id)}
          />
          <span>Select {row.studentName}</span>
        </label>
        <div>
          <p className="card-eyebrow card-eyebrow--red">Completed Today</p>
          <h2>{row.studentName}</h2>
          <div className="daily-reminder-meta">
            <span>{row.completionType}</span>
            <span>Completed {formatTime(row.completionTime)}</span>
            <span>{row.email || "Email unavailable"}</span>
            <span>{row.phone || "WhatsApp number unavailable"}</span>
            <span className={`daily-reminder-whatsapp-chip is-${row.whatsapp?.tone || "warning"}`}>
              {row.whatsapp?.label || "WhatsApp number unavailable"}
            </span>
          </div>
          <PersonalizationMeta row={row} />
        </div>
        <span className={`daily-reminder-status ${row.alreadyEncouragedToday ? "is-done" : ""}`}>
          {row.encouragementStatus}
        </span>
      </div>

      <MessagePreview title="Encouragement preview" message={row.previews.encouragement} />

      <div className="daily-reminder-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={!row.whatsapp?.canUse || isBusy || row.alreadyEncouragedToday}
          onClick={() => onOpenWhatsapp(row, "encouragement")}
        >
          {whatsappButtonText}
        </button>
        <button className="secondary-button" type="button" disabled={!row.whatsapp?.canUse || isBusy} onClick={() => onCopy(row.previews.encouragement)}>
          Copy encouragement
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={isManualLoggingDisabled || isBusy || row.alreadyEncouragedToday}
          onClick={() => onMark(row, "manual_completed", "manual", row.previews.encouragement)}
        >
          {row.alreadyEncouragedToday ? "Handled today" : "Mark handled"}
        </button>
      </div>
    </article>
  );
}

function DashboardNotice({ children, tone = "info" }) {
  return (
    <section className={`daily-reminder-notice daily-reminder-notice--${tone}`}>
      {children}
    </section>
  );
}

export function DailyRemindersPage({ user, profile }) {
  const [state, setState] = useState({
    isLoading: false,
    dashboard: null,
    error: ""
  });
  const [actionStatus, setActionStatus] = useState({
    type: "idle",
    message: ""
  });
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [selectedEncouragementIds, setSelectedEncouragementIds] = useState([]);
  const [bulkConfirmation, setBulkConfirmation] = useState(null);
  const [whatsappQueue, setWhatsappQueue] = useState(null);

  async function loadDashboard() {
    setState({
      isLoading: true,
      dashboard: null,
      error: ""
    });

    const result = await getDailyReminderDashboard(profile);

    setState({
      isLoading: false,
      dashboard: result.dashboard,
      error: result.error || ""
    });
  }

  useEffect(() => {
    if (["teacher", "admin"].includes(profile?.role)) {
      loadDashboard();
    }
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    const dashboard = state.dashboard;

    if (!dashboard) {
      setSelectedReminderIds([]);
      setSelectedEncouragementIds([]);
      return;
    }

    setSelectedReminderIds(
      dashboard.needsReminder.filter(isReminderEligible).map((row) => row.student.id)
    );
    setSelectedEncouragementIds(
      dashboard.completedToday.filter(isEncouragementEligible).map((row) => row.student.id)
    );
  }, [state.dashboard]);

  async function handleCopy(message) {
    try {
      await navigator.clipboard.writeText(message);
      setActionStatus({
        type: "success",
        message: "Message copied."
      });
    } catch {
      setActionStatus({
        type: "error",
        message: "Could not copy the message. Select the preview text and copy it manually."
      });
    }
  }

  async function handleOpenWhatsapp(row, kind, options = {}) {
    const message = getWhatsappMessage(row, kind);
    const link = getWhatsappLink(row, kind);
    const isEncouragement = kind === "encouragement";
    const alreadyHandled = isEncouragement ? row.hasWhatsappEncouragementLog : row.hasWhatsappReminderLog;

    if (!row.whatsapp?.canUse || !link) {
      setActionStatus({
        type: "error",
        message: row.whatsapp?.label || "WhatsApp is not ready for this student."
      });
      return false;
    }

    if (alreadyHandled) {
      setActionStatus({
        type: "success",
        message: isEncouragement
          ? "WhatsApp encouragement was already opened today."
          : "WhatsApp reminder was already opened today."
      });

      if (options.fromQueue) {
        moveWhatsappQueueNext((current) => ({
          duplicateSkipped: current.duplicateSkipped + 1
        }));
      }

      return false;
    }

    const openedWindow = window.open(link, "_blank");

    if (!openedWindow) {
      setActionStatus({
        type: "error",
        message: "Could not open WhatsApp. Your browser may have blocked the popup."
      });
      return false;
    }

    try {
      openedWindow.opener = null;
    } catch {
      // WhatsApp still opened; clearing opener is a best-effort browser safety step.
    }

    setActionStatus({
      type: "submitting",
      message: "WhatsApp opened. Marking this reminder as handled..."
    });

    const result = await markDailyReminderOpened({
      profile,
      studentId: row.student.id,
      reminderSlot: getReminderSlotForKind(kind),
      messagePreview: message
    });

    if (result.error) {
      const isDuplicate = result.error.toLowerCase().includes("already");

      if (isDuplicate) {
        setActionStatus({
          type: "success",
          message: "This WhatsApp item was already handled today."
        });

        if (options.fromQueue) {
          moveWhatsappQueueNext((current) => ({
            duplicateSkipped: current.duplicateSkipped + 1
          }));
        } else {
          await loadDashboard();
        }

        return false;
      }

      setActionStatus({
        type: "error",
        message: result.error
      });
      return false;
    }

    setActionStatus({
      type: "success",
      message: isEncouragement
        ? "WhatsApp encouragement opened and handled."
        : "WhatsApp reminder opened and handled."
    });

    if (options.fromQueue) {
      moveWhatsappQueueNext((current) => ({
        handled: current.handled + 1
      }));
    } else {
      await loadDashboard();
    }

    return Boolean(message);
  }

  async function handleMark(row, reminderSlot, channel, messagePreview) {
    setActionStatus({
      type: "submitting",
      message: "Marking reminder..."
    });

    const result = await markDailyReminderManually({
      profile,
      studentId: row.student.id,
      reminderSlot,
      channel,
      messagePreview
    });

    if (result.error) {
      setActionStatus({
        type: "error",
        message: result.error
      });
      return;
    }

    setActionStatus({
      type: "success",
      message: "Reminder handled manually."
    });
    await loadDashboard();
  }

  function toggleReminderSelection(studentId) {
    setSelectedReminderIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function toggleEncouragementSelection(studentId) {
    setSelectedEncouragementIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  async function handleCopyWhatsappMessages(kind, rows) {
    const isEncouragement = kind === "encouragement";
    const readyRows = rows.filter(isEncouragement ? isWhatsappEncouragementReady : isWhatsappReminderReady);

    if (!readyRows.length) {
      setActionStatus({
        type: "error",
        message: "No selected students are WhatsApp-ready."
      });
      return;
    }

    const text = readyRows
      .map((row) => `${row.studentName}\n${getWhatsappMessage(row, kind)}`)
      .join("\n\n---\n\n");

    await handleCopy(text);
  }

  function openBulkConfirmation(kind, rows, options = {}) {
    if (!rows.length) {
      setActionStatus({
        type: "error",
        message: "Select at least one eligible student first."
      });
      return;
    }

    const isEncouragement = kind === "encouragement";
    const channel = options.channel || "manual";
    const isWhatsapp = channel === "whatsapp";
    setBulkConfirmation({
      kind,
      rows,
      count: rows.length,
      channel,
      reminderSlot: options.reminderSlot || (isEncouragement ? "manual_completed" : "manual_missing"),
      title: isWhatsapp
        ? isEncouragement
          ? "Handle WhatsApp encouragement?"
          : "Handle WhatsApp reminders?"
        : isEncouragement
          ? "Mark encouragement handled?"
          : "Mark reminders handled?",
      body: isEncouragement
        ? `You are about to mark encouragement messages for ${rows.length} students who completed today's task. Only confirm after handling them manually.`
        : `You are about to mark reminders for ${rows.length} students who have not completed today's task. Only confirm after handling them manually.`
    });
  }

  function prepareWhatsappQueue(kind, rows) {
    if (!rows.length) {
      setActionStatus({
        type: "error",
        message: "Select at least one student first."
      });
      return;
    }

    const isEncouragement = kind === "encouragement";
    const isReady = isEncouragement ? isWhatsappEncouragementReady : isWhatsappReminderReady;
    const unavailableCounts = getUnavailableWhatsAppCounts(rows, kind);
    const queueRows = rows.filter(isReady);

    if (!queueRows.length) {
      setActionStatus({
        type: "error",
        message: unavailableCounts.missingNumber || unavailableCounts.invalidNumber || unavailableCounts.optInMissing || unavailableCounts.unavailable || unavailableCounts.duplicateSkipped
          ? `No WhatsApp-ready students to queue. ${unavailableCounts.missingNumber} missing number, ${unavailableCounts.invalidNumber} invalid number, ${unavailableCounts.optInMissing} opt-in missing, ${unavailableCounts.duplicateSkipped} already handled today.`
          : "No WhatsApp-ready students to queue."
      });
      return;
    }

    setWhatsappQueue({
      kind,
      rows: queueRows,
      index: 0,
      handled: 0,
      skipped: 0,
      ...unavailableCounts
    });
    setActionStatus({
      type: "info",
      message: "WhatsApp queue prepared. Open one student at a time."
    });
  }

  function moveWhatsappQueueNext(updates = {}) {
    setWhatsappQueue((current) => {
      if (!current) {
        return current;
      }

      const resolvedUpdates = typeof updates === "function" ? updates(current) : updates;

      return {
        ...current,
        ...resolvedUpdates,
        index: current.index + 1
      };
    });
  }

  function handleQueueSkip() {
    moveWhatsappQueueNext((current) => ({
      skipped: current.skipped + 1
    }));
  }

  function handleQueueNext() {
    moveWhatsappQueueNext();
  }

  async function closeWhatsappQueue() {
    setWhatsappQueue(null);
    await loadDashboard();
  }

  async function handleBulkConfirm() {
    if (!bulkConfirmation) {
      return;
    }

    setActionStatus({
      type: "submitting",
      message: bulkConfirmation.kind === "encouragement"
        ? "Marking encouragement messages..."
        : "Marking reminders..."
    });

    const result = await markDailyRemindersManually({
      profile,
      reminderSlot: bulkConfirmation.reminderSlot,
      channel: bulkConfirmation.channel || "manual",
      entries: bulkConfirmation.rows.map((row) => ({
        studentId: row.student.id,
        studentName: row.studentName,
        messagePreview: bulkConfirmation.kind === "encouragement"
          ? row.previews.encouragement
          : bulkConfirmation.channel === "whatsapp"
            ? row.previews.whatsappReminder
            : row.previews.emailReminder
      }))
    });

    const summary = result.summary;
    const actionNoun = bulkConfirmation.kind === "encouragement" ? "encouraged" : "reminded";
    const failureText = summary.failed
      ? ` ${summary.failed} failed and should be checked manually.`
      : "";

    setBulkConfirmation(null);
    setActionStatus({
      type: result.error ? "error" : "success",
      message: result.error ||
        `Handled ${summary.marked} students as ${actionNoun}. ${summary.skipped} were skipped because they were already handled today.${failureText}`
    });
    await loadDashboard();
  }

  if (profile?.role === "student") {
    return (
      <div className="daily-reminders-page">
        <Header
          user={user}
          title="Daily Reminders"
          subtitle="See who needs a gentle reminder today and who deserves encouragement."
        />
        <DailyReminderState
          title="Daily reminders are only available for teacher and admin accounts."
          message="Students can see their own daily habit status on Home and Practice."
        />
      </div>
    );
  }

  if (!["teacher", "admin"].includes(profile?.role)) {
    return (
      <div className="daily-reminders-page">
        <Header
          user={user}
          title="Daily Reminders"
          subtitle="See who needs a gentle reminder today and who deserves encouragement."
        />
        <DailyReminderState
          title="Daily reminders are not available for this account."
          message="Use a teacher or admin account to open reminder previews."
        />
      </div>
    );
  }

  const dashboard = state.dashboard;
  const isManualLoggingDisabled = Boolean(dashboard?.reminderLogsMigrationRequired);
  const isBusy = actionStatus.type === "submitting";
  const eligibleReminderRows = dashboard?.needsReminder.filter(isReminderEligible) || [];
  const whatsappReadyReminderRows = dashboard?.needsReminder.filter(isWhatsappReminderReady) || [];
  const selectedReminderRows = dashboard
    ? getSelectedEligibleRows(dashboard.needsReminder, selectedReminderIds, isReminderEligible)
    : [];
  const eligibleEncouragementRows = dashboard?.completedToday.filter(isEncouragementEligible) || [];
  const whatsappReadyEncouragementRows = dashboard?.completedToday.filter(isWhatsappEncouragementReady) || [];
  const selectedEncouragementRows = dashboard
    ? getSelectedEligibleRows(dashboard.completedToday, selectedEncouragementIds, isEncouragementEligible)
    : [];

  return (
    <div className="daily-reminders-page">
      <Header
        user={user}
        title="Daily Reminders"
        subtitle="See who needs a gentle reminder today and who deserves encouragement."
      />

      {state.isLoading ? (
        <DailyReminderState
          title="Loading daily reminders..."
          message="Please wait while we check today's student activity."
        />
      ) : state.error ? (
        <DailyReminderState
          title="Could not load Daily Reminders."
          message={state.error}
        />
      ) : !dashboard ? (
        <DailyReminderState
          title="Daily reminder data is not ready."
          message="Please try again in a moment."
        />
      ) : !dashboard.stats.totalActiveStudents ? (
        <DailyReminderState
          title="No active students found."
          message={
            profile.role === "teacher"
              ? "Assigned active students will appear here after an admin links them to you."
              : "Active student profiles will appear here after they are created."
          }
        />
      ) : (
        <>
          <section className="card daily-reminder-hero">
            <div>
              <p className="card-eyebrow card-eyebrow--red">Europe/Istanbul</p>
              <h2>{formatDate(dashboard.todayKey)}</h2>
              <p>
                Detection uses real speaking and writing submissions submitted today. These previews
                are not sent automatically.
              </p>
            </div>
            <div className="daily-reminder-hero__icon" aria-hidden="true">
              <BellIcon />
            </div>
          </section>

          {!dashboard.hasReminderVoice && (
            <DashboardNotice tone="warning">
              <strong>No reminder voice found.</strong>
              <p>Set your Teacher Reminder Voice on Profile to make these messages feel more personal.</p>
            </DashboardNotice>
          )}

          <DashboardNotice>
            <strong>WhatsApp consent reminder.</strong>
            <p>Only send WhatsApp reminders to students who agreed to receive them. The app prepares messages; it does not send them automatically.</p>
          </DashboardNotice>

          {dashboard.voiceError && (
            <DashboardNotice tone="warning">
              <strong>Reminder voice note.</strong>
              <p>{dashboard.voiceError}</p>
            </DashboardNotice>
          )}

          {dashboard.motivationProfileError && (
            <DashboardNotice tone="warning">
              <strong>Motivation profile note.</strong>
              <p>{dashboard.motivationProfileError}</p>
            </DashboardNotice>
          )}

          {dashboard.reminderLogsMigrationRequired && (
            <DashboardNotice tone="warning">
              <strong>Manual marks need the latest reminder log migration.</strong>
              <p>Run supabase/migrations/0025_daily_reminder_dashboard.sql to enable reminder slots and manual dashboard logs.</p>
            </DashboardNotice>
          )}

          {actionStatus.message && (
            <DashboardNotice tone={actionStatus.type === "error" ? "error" : "info"}>
              <p>{actionStatus.message}</p>
            </DashboardNotice>
          )}

          <SummaryCards stats={dashboard.stats} />

          <section className="daily-reminder-layout">
            <div className="daily-reminder-section">
              <div className="daily-reminder-section__header">
                <div>
                  <p className="card-eyebrow card-eyebrow--red">Needs Reminder</p>
                  <h2>{eligibleReminderRows.length} need action</h2>
                </div>
              </div>
              {dashboard.needsReminder.length ? (
                <BulkActionBar
                  title="Bulk reminder actions"
                  eligibleCount={eligibleReminderRows.length}
                  selectedCount={selectedReminderRows.length}
                  whatsappReadyCount={whatsappReadyReminderRows.length}
                  disabled={isManualLoggingDisabled || isBusy}
                  selectedLabel="Mark selected as reminded"
                  allLabel="Mark all eligible as reminded"
                  whatsappLabel="Prepare WhatsApp reminder queue"
                  onSelectAll={() => setSelectedReminderIds(eligibleReminderRows.map((row) => row.student.id))}
                  onSelectWhatsappReady={() => setSelectedReminderIds(whatsappReadyReminderRows.map((row) => row.student.id))}
                  onClear={() => setSelectedReminderIds([])}
                  onSelected={() => openBulkConfirmation("reminder", selectedReminderRows)}
                  onAll={() => openBulkConfirmation("reminder", eligibleReminderRows)}
                  onCopyWhatsappMessages={() => handleCopyWhatsappMessages("reminder", selectedReminderRows)}
                  onPrepareWhatsappQueue={() => prepareWhatsappQueue("reminder", selectedReminderRows)}
                />
              ) : null}

              {!dashboard.needsReminder.length ? (
                <DailyReminderState
                  title={<>Everyone completed today {"\u{1F389}"}</>}
                  message="No reminder previews are needed right now."
                />
              ) : (
                <div className="daily-reminder-card-list">
                  {dashboard.needsReminder.map((row) => (
                    <NeedsReminderCard
                      row={row}
                      isSelected={selectedReminderIds.includes(row.student.id)}
                      isSelectable={isReminderEligible(row)}
                      isManualLoggingDisabled={isManualLoggingDisabled}
                      isBusy={isBusy}
                      onCopy={handleCopy}
                      onOpenWhatsapp={handleOpenWhatsapp}
                      onMark={handleMark}
                      onToggleSelected={toggleReminderSelection}
                      key={row.student.id}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="daily-reminder-section">
              <div className="daily-reminder-section__header">
                <div>
                  <p className="card-eyebrow card-eyebrow--red">Completed Today</p>
                  <h2>{dashboard.completedToday.length} students</h2>
                </div>
              </div>
              {dashboard.completedToday.length ? (
                <BulkActionBar
                  title="Bulk encouragement actions"
                  eligibleCount={eligibleEncouragementRows.length}
                  selectedCount={selectedEncouragementRows.length}
                  whatsappReadyCount={whatsappReadyEncouragementRows.length}
                  disabled={isManualLoggingDisabled || isBusy}
                  selectedLabel="Mark selected as encouraged"
                  allLabel="Mark all eligible as encouraged"
                  whatsappLabel="Prepare WhatsApp encouragement queue"
                  onSelectAll={() => setSelectedEncouragementIds(eligibleEncouragementRows.map((row) => row.student.id))}
                  onSelectWhatsappReady={() => setSelectedEncouragementIds(whatsappReadyEncouragementRows.map((row) => row.student.id))}
                  onClear={() => setSelectedEncouragementIds([])}
                  onSelected={() => openBulkConfirmation("encouragement", selectedEncouragementRows)}
                  onAll={() => openBulkConfirmation("encouragement", eligibleEncouragementRows)}
                  onCopyWhatsappMessages={() => handleCopyWhatsappMessages("encouragement", selectedEncouragementRows)}
                  onPrepareWhatsappQueue={() => prepareWhatsappQueue("encouragement", selectedEncouragementRows)}
                />
              ) : null}

              {!dashboard.completedToday.length ? (
                <DailyReminderState
                  title="No completions yet today."
                  message="Completed speaking or writing submissions will appear here."
                />
              ) : (
                <div className="daily-reminder-card-list">
                  {dashboard.completedToday.map((row) => (
                    <CompletedTodayCard
                      row={row}
                      isSelected={selectedEncouragementIds.includes(row.student.id)}
                      isSelectable={isEncouragementEligible(row)}
                      isManualLoggingDisabled={isManualLoggingDisabled}
                      isBusy={isBusy}
                      onCopy={handleCopy}
                      onOpenWhatsapp={handleOpenWhatsapp}
                      onMark={handleMark}
                      onToggleSelected={toggleEncouragementSelection}
                      key={row.student.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
          <BulkConfirmationModal
            confirmation={bulkConfirmation}
            isBusy={isBusy}
            onCancel={() => setBulkConfirmation(null)}
            onConfirm={handleBulkConfirm}
          />
          <WhatsAppQueueModal
            queue={whatsappQueue}
            isBusy={isBusy}
            onClose={closeWhatsappQueue}
            onOpen={(row, kind) => handleOpenWhatsapp(row, kind, { fromQueue: true })}
            onCopy={handleCopy}
            onSkip={handleQueueSkip}
            onNext={handleQueueNext}
          />
        </>
      )}
    </div>
  );
}
