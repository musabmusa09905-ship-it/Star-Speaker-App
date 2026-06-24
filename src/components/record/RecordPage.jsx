import { useEffect, useMemo, useState } from "react";
import { NoTaskSelectedState } from "./NoTaskSelectedState.jsx";
import { RecordingPanel } from "./RecordingPanel.jsx";
import { SelfReflectionCard } from "./SelfReflectionCard.jsx";
import { SpeakingChecklist } from "./SpeakingChecklist.jsx";
import { SpeakingTaskCard } from "./SpeakingTaskCard.jsx";
import { GuidingPhrasesCard } from "./GuidingPhrasesCard.jsx";
import { SubmitRecordingCard } from "./SubmitRecordingCard.jsx";
import { SubmissionRewardCard } from "./SubmissionRewardCard.jsx";
import { ArrowLeftIcon } from "../icons.jsx";
import { getAssignedTaskById } from "../../lib/assignedTasks.js";
import {
  createSubmissionPlaybackUrl,
  getLatestSubmissionForTask
} from "../../lib/studentSubmissions.js";
import { submitVoiceRecording } from "../../lib/submissions.js";
import { buildTaskClarity } from "../../lib/taskClarity.js";
import {
  STUDENT_ACTIVITY_EVENT_TYPES,
  logStudentActivityEventQuietly
} from "../../lib/studentActivityEvents.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatTaskType(value) {
  if (!value) {
    return "Practice";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function toRecordTask(task) {
  return {
    label: "Speaking Task",
    status: task.status,
    title: task.title,
    task_type: task.task_type,
    description: task.description,
    prompt: task.description || "Review your task instructions and prepare your answer.",
    instructions: task.instructions,
    guiding_phrases: task.guiding_phrases || [],
    checklist: task.checklist || [],
    estimated_minutes: task.estimated_minutes,
    level: task.level,
    focus: task.focus,
    details: [
      { icon: "book", label: `Type: ${formatTaskType(task.task_type)}` },
      { icon: "clock", label: `${task.estimated_minutes || 10} min practice` },
      task.focus ? { icon: "target", label: `Focus: ${task.focus}` } : null,
      { icon: "target", label: `Due: ${formatDate(task.due_date)}` }
    ].filter(Boolean)
  };
}

function getTaskIdFromUrl() {
  return new URLSearchParams(window.location.search).get("taskId");
}

function buildState(title, message, cta = "Go to Practice") {
  return {
    title,
    message,
    cta
  };
}

function TaskStatusState({ task, profile }) {
  const [playback, setPlayback] = useState({
    status: task.status === "submitted" ? "loading" : "idle",
    signedUrl: "",
    error: "",
    submission: null
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const isReviewed = task.status === "reviewed";

  useEffect(() => {
    let isMounted = true;

    async function loadPlayback() {
      if (task.status !== "submitted") {
        return;
      }

      setPlayback({
        status: "loading",
        signedUrl: "",
        error: "",
        submission: null
      });

      const submissionResult = await getLatestSubmissionForTask({
        studentId: profile.id,
        assignedTaskId: task.id
      });

      if (!isMounted) {
        return;
      }

      if (submissionResult.error) {
        setPlayback({
          status: "error",
          signedUrl: "",
          error: submissionResult.error,
          submission: null
        });
        return;
      }

      if (!submissionResult.submission?.audio_path) {
        setPlayback({
          status: "missing",
          signedUrl: "",
          error: "",
          submission: submissionResult.submission || null
        });
        return;
      }

      const playbackResult = await createSubmissionPlaybackUrl({
        submission: submissionResult.submission,
        currentStudentId: profile.id,
        expiresInSeconds: 300
      });

      if (!isMounted) {
        return;
      }

      if (playbackResult.error) {
        setPlayback({
          status: "error",
          signedUrl: "",
          error: playbackResult.error,
          submission: submissionResult.submission
        });
        return;
      }

      setPlayback({
        status: "ready",
        signedUrl: playbackResult.signedUrl,
        error: "",
        submission: submissionResult.submission
      });
    }

    loadPlayback();

    return () => {
      isMounted = false;
    };
  }, [profile.id, refreshKey, task.id, task.status]);

  return (
    <SubmissionRewardCard
      task={task}
      status={isReviewed ? "reviewed" : "submitted"}
      durationSeconds={playback.submission?.duration_seconds || 0}
      submittedAt={playback.submission?.submitted_at || ""}
    >
      {!isReviewed && (
        <div className="record-status-playback">
          {playback.status === "loading" && <p>Preparing your submitted recording...</p>}
          {playback.status === "missing" && <p>No submitted recording file was found for this task.</p>}
          {playback.status === "error" && (
            <>
              <p>Could not load submitted recording playback.</p>
              {playback.error && <span>{playback.error}</span>}
              <button type="button" className="text-button" onClick={() => setRefreshKey((key) => key + 1)}>
                Refresh playback
              </button>
            </>
          )}
          {playback.status === "ready" && (
            <>
              <p>Your submitted recording</p>
              <span>Private playback link expires shortly.</span>
              <audio controls src={playback.signedUrl}>
                Your browser does not support audio playback.
              </audio>
            </>
          )}
        </div>
      )}
    </SubmissionRewardCard>
  );
}

function ExtraChallengeCard({ task }) {
  const challenge = buildTaskClarity(task).challenge;

  if (!challenge) {
    return null;
  }

  return (
    <details className="card task-extra-challenge-card" aria-labelledby="extra-challenge-title">
      <summary>
        <span>
          <small className="card-eyebrow card-eyebrow--red">Extra Challenge</small>
          <strong id="extra-challenge-title">Optional stretch</strong>
        </span>
        <span className="task-extra-challenge-card__toggle">Open</span>
      </summary>
      <p>{challenge}</p>
      <span>Your main goal is still one clear, understandable recording.</span>
    </details>
  );
}

export function RecordPage({ data, user, profile }) {
  const [taskId, setTaskId] = useState(getTaskIdFromUrl);
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [state, setState] = useState(null);
  const [recordingResult, setRecordingResult] = useState({
    hasRecording: false,
    blob: null,
    audioUrl: "",
    durationSeconds: 0
  });
  const [reflectionText, setReflectionText] = useState("");
  const [selfRating, setSelfRating] = useState(0);
  const [submissionState, setSubmissionState] = useState({
    status: "idle",
    message: "",
    detail: ""
  });
  const isStudent = profile?.role === "student";

  useEffect(() => {
    const updateTaskId = () => setTaskId(getTaskIdFromUrl());

    window.addEventListener("popstate", updateTaskId);

    return () => {
      window.removeEventListener("popstate", updateTaskId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTask() {
      setTask(null);
      setError(null);
      setRecordingResult({
        hasRecording: false,
        blob: null,
        audioUrl: "",
        durationSeconds: 0
      });
      setReflectionText("");
      setSelfRating(0);
      setSubmissionState({
        status: "idle",
        message: "",
        detail: ""
      });

      if (!taskId) {
        setState(data.emptyState);
        setIsLoading(false);
        return;
      }

      if (!isStudent) {
        setState(
          buildState(
            "Recording tasks are for student accounts.",
            "Students record here. Teachers review submitted recordings from Teacher Review.",
            "Go to Practice"
          )
        );
        setIsLoading(false);
        return;
      }

      if (!uuidPattern.test(taskId)) {
        setState(buildState("Task not found.", "Choose a valid speaking task from Daily Practice."));
        setIsLoading(false);
        return;
      }

      setState(null);
      setIsLoading(true);
      const result = await getAssignedTaskById(taskId);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setError(result.error);
        setState(
          buildState(
            "Could not load this task. Please try again.",
            result.error,
            "Go to Practice"
          )
        );
        return;
      }

      if (!result.task) {
        setState(buildState("Task not found.", "Choose a speaking task from Daily Practice."));
        return;
      }

      if (result.task.student_id !== profile.id) {
        setState(
          buildState(
            "You do not have access to this task.",
            "Choose one of your assigned speaking tasks from Daily Practice."
          )
        );
        return;
      }

      setTask(result.task);
      logStudentActivityEventQuietly({
        profile,
        eventType: STUDENT_ACTIVITY_EVENT_TYPES.taskViewed,
        taskId: result.task.id,
        teacherId: result.task.teacher_id || null,
        dedupeKey: `task:${result.task.id}`,
        metadata: {
          taskStatus: result.task.status || ""
        }
      });
    }

    loadTask();

    return () => {
      isMounted = false;
    };
  }, [data.emptyState, isStudent, profile?.id, taskId]);

  const recordTask = useMemo(() => (task ? toRecordTask(task) : null), [task]);
  const phrases = task?.guiding_phrases || [];
  const checklist =
    task?.checklist && task.checklist.length > 0
      ? task.checklist
      : ["Check your clarity, timing, and effort before submitting."];

  function handleRecordingChange(nextRecording) {
    setRecordingResult(nextRecording);

    if (submissionState.status !== "submitting") {
      setSubmissionState({
        status: "idle",
        message: "",
        detail: ""
      });
    }
  }

  async function handleSubmitRecording() {
    if (!task || !profile?.id) {
      setSubmissionState({
        status: "error",
        message: "You do not have access to this task.",
        detail: ""
      });
      return;
    }

    if (!["assigned", "in_progress"].includes(task.status)) {
      setSubmissionState({
        status: "error",
        message: "This task cannot accept another recording.",
        detail: "Submitted and reviewed tasks stay locked for now."
      });
      return;
    }

    if (submissionState.status === "submitting") {
      return;
    }

    setSubmissionState({
      status: "submitting",
      message: "Uploading your recording. Please keep this page open.",
      detail: ""
    });

    const result = await submitVoiceRecording({
      assignedTaskId: task.id,
      studentId: profile.id,
      audioBlob: recordingResult.blob,
      durationSeconds: recordingResult.durationSeconds,
      reflectionText,
      selfRating
    });

    if (!result.ok) {
      if (result.stage === "task-status") {
        setSubmissionState({
          status: "partial",
          message: result.message,
          detail: result.detail || ""
        });
        return;
      }

      setSubmissionState({
        status: "error",
        message: result.message,
        detail: result.detail || ""
      });
      return;
    }

    setTask((currentTask) =>
      currentTask
        ? {
            ...currentTask,
            status: "submitted"
          }
        : currentTask
    );
    logStudentActivityEventQuietly({
      profile,
      eventType: STUDENT_ACTIVITY_EVENT_TYPES.taskSubmitted,
      taskId: task.id,
      submissionId: result.submission?.id || null,
      teacherId: task.teacher_id || null,
      metadata: {
        taskStatus: "submitted"
      }
    });
    setSubmissionState({
      status: "success",
      message: "Submitted. You showed up today.",
      detail: ""
    });
  }

  const emptyState = isLoading
    ? buildState("Loading task...", "Please wait while we open your speaking task.", null)
    : state;
  const isLockedTask =
    task &&
    ["submitted", "reviewed"].includes(task.status) &&
    submissionState.status !== "success" &&
    submissionState.status !== "partial";
  const isFreshSubmission =
    recordTask &&
    task &&
    (submissionState.status === "success" || submissionState.status === "partial");

  return (
    <div className="record-page">
      <a className="record-back-link" href="/">
        <ArrowLeftIcon />
        Back to Home
      </a>

      {isFreshSubmission ? (
        <div className="record-grid">
          <SpeakingTaskCard task={recordTask} />
          <SubmissionRewardCard
            task={task}
            status={submissionState.status === "partial" ? "partial" : "submitted"}
            durationSeconds={recordingResult.durationSeconds}
            detail={submissionState.detail}
          />
        </div>
      ) : recordTask && isLockedTask ? (
        <div className="record-grid">
          <SpeakingTaskCard task={recordTask} />
          <TaskStatusState task={task} profile={profile} />
        </div>
      ) : recordTask ? (
        <div className="record-grid">
          <SpeakingTaskCard task={recordTask} starterPhrases={phrases} />
          <RecordingPanel
            key={task.id}
            recording={data.recording}
            disabled={submissionState.status === "submitting" || submissionState.status === "success"}
            onRecordingChange={handleRecordingChange}
            onRecordingStarted={() =>
              logStudentActivityEventQuietly({
                profile,
                eventType: STUDENT_ACTIVITY_EVENT_TYPES.recordingStarted,
                taskId: task.id,
                teacherId: task.teacher_id || null,
                metadata: {
                  taskStatus: task.status || ""
                }
              })
            }
          />
          <SelfReflectionCard
            reflection={data.reflection}
            rating={selfRating}
            note={reflectionText}
            disabled={submissionState.status === "submitting" || submissionState.status === "success"}
            onRatingChange={setSelfRating}
            onNoteChange={setReflectionText}
          />
          <SubmitRecordingCard
            submit={data.submit}
            hasRecording={recordingResult.hasRecording}
            isSubmitting={submissionState.status === "submitting"}
            isSubmitted={submissionState.status === "success" || submissionState.status === "partial"}
            message={submissionState.message}
            detail={submissionState.detail}
            onSubmit={handleSubmitRecording}
          />
          <div className="record-desktop-support">
            <GuidingPhrasesCard phrases={phrases} />
            <SpeakingChecklist items={checklist} />
          </div>
          <details className="card record-mobile-support">
            <summary>
              <span>More task support</span>
              <b>Phrases and checklist</b>
            </summary>
            <div className="record-mobile-support__body">
              <GuidingPhrasesCard phrases={phrases} />
              <SpeakingChecklist items={checklist} />
            </div>
          </details>
          <ExtraChallengeCard task={task} />
        </div>
      ) : (
        <NoTaskSelectedState emptyState={emptyState || data.emptyState} />
      )}
    </div>
  );
}
