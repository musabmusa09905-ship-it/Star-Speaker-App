import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { CorrectionBankPreview } from "./CorrectionBankPreview.jsx";
import { FeedbackEmptyState } from "./FeedbackEmptyState.jsx";
import { FeedbackMethodCard } from "./FeedbackMethodCard.jsx";
import { NextFocusCard } from "./NextFocusCard.jsx";
import { RecentFeedbackList } from "./RecentFeedbackList.jsx";
import { FeedbackStatusCard } from "./FeedbackStatusCard.jsx";
import { TeacherWeeklyReviewCard } from "./TeacherWeeklyReviewCard.jsx";
import { getSubmissionsForStudent } from "../../lib/studentSubmissions.js";
import { getWritingStudentOverview } from "../../lib/writingPractice.js";
import {
  STUDENT_ACTIVITY_EVENT_TYPES,
  logStudentActivityEventQuietly
} from "../../lib/studentActivityEvents.js";

function buildFeedbackState(title, message, note = "", cta = "Go to Practice", href = "/practice") {
  return {
    title,
    message,
    note,
    cta,
    href
  };
}

function WritingFeedbackSection({ writing }) {
  const submissions = writing?.submissions || [];
  const reviewedSubmissions = submissions.filter((submission) => submission.status === "reviewed");
  const waitingSubmissions = submissions.filter((submission) => submission.status !== "reviewed");

  function getCorrection(submission) {
    return submission?.one_correction || submission?.correction_note || "";
  }

  function getEncouragement(submission) {
    return submission?.encouragement || submission?.encouragement_note || "";
  }

  return (
    <section className="card writing-feedback-section" aria-labelledby="writing-feedback-title">
      <div>
        <p className="card-eyebrow card-eyebrow--red">Writing feedback</p>
        <h2 id="writing-feedback-title">
          {reviewedSubmissions.length ? "Reviewed writing" : "No reviewed writing yet"}
        </h2>
        <p>
          {submissions.length
            ? "Writing feedback appears here after your teacher reviews submitted answers."
            : "Submit a writing task to begin building your written English history."}
        </p>
      </div>

      {reviewedSubmissions.length ? (
        <div className="writing-feedback-section__list">
          {reviewedSubmissions.slice(0, 3).map((submission) => (
            <article key={submission.id}>
              <span>Reviewed</span>
              <p>{submission.teacher_feedback || "Your teacher has not added a general note yet."}</p>
              {getCorrection(submission) && <small>One correction: {getCorrection(submission)}</small>}
              {getEncouragement(submission) && <small>Encouragement: {getEncouragement(submission)}</small>}
              {submission.corrected_version && <small>Corrected version: {submission.corrected_version}</small>}
              {submission.next_focus && <small>Next focus: {submission.next_focus}</small>}
              {(submission.clarity_score || submission.accuracy_score || submission.structure_score) && (
                <small>
                  Scores: clarity {submission.clarity_score || "-"} / accuracy {submission.accuracy_score || "-"} / structure {submission.structure_score || "-"}
                </small>
              )}
            </article>
          ))}
        </div>
      ) : waitingSubmissions.length ? (
        <p className="writing-feedback-section__note">Waiting for teacher review.</p>
      ) : (
        <a className="secondary-button" href="/writing">Open Writing</a>
      )}
    </section>
  );
}

export function FeedbackPage({ data, user, profile }) {
  const [submissions, setSubmissions] = useState([]);
  const [writing, setWriting] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isStudent = profile?.role === "student";

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions() {
      setSubmissions([]);
      setWriting(null);
      setError("");

      if (!isStudent || !profile?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const [result, writingResult] = await Promise.all([
        getSubmissionsForStudent(profile.id),
        getWritingStudentOverview(profile.id)
      ]);

      if (!isMounted) {
        return;
      }

      setIsLoading(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubmissions(result.submissions);
      setWriting(writingResult);
      result.submissions
        .filter((submission) => submission.feedback)
        .forEach((submission) => {
          logStudentActivityEventQuietly({
            profile,
            eventType: STUDENT_ACTIVITY_EVENT_TYPES.feedbackViewed,
            taskId: submission.assigned_task_id,
            submissionId: submission.id,
            teacherId: submission.feedback?.teacher_id || null,
            dedupeKey: `feedback:${submission.feedback.id}`,
            metadata: {
              feedbackId: submission.feedback.id
            }
          });
        });
    }

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [isStudent, profile?.id]);

  const latestNextFocus = useMemo(() => {
    return submissions.find((submission) => submission.feedback?.next_focus)?.feedback?.next_focus || "";
  }, [submissions]);
  const nextFocus = latestNextFocus
    ? {
        ...data.nextFocus,
        message: latestNextFocus
      }
    : data.nextFocus;
  const hasSubmissions = submissions.length > 0;
  const hasReviewedSubmission = submissions.some((submission) => submission.feedback);
  const statusState = !isStudent
    ? buildFeedbackState(
        "Feedback history is shown for student accounts.",
        "Students use this page to review coaching notes after submission.",
        "This page is the student-facing feedback history.",
        "Open Review",
        profile?.role === "teacher" ? "/teacher/review" : "/profile"
      )
    : isLoading
      ? buildFeedbackState(
          "Loading your feedback...",
          "Please wait while we check your submitted recordings.",
          "",
          ""
        )
      : error
        ? buildFeedbackState(
            "Could not load feedback. Please try again.",
            error,
            "",
            "Go to Practice",
            "/practice"
          )
        : hasSubmissions
          ? buildFeedbackState(
              hasReviewedSubmission ? "Feedback is ready" : "Waiting for teacher review",
              hasReviewedSubmission
                ? "Start with the summary below, then choose one correction to apply in your next recording."
                : "Your recording is waiting for teacher review. Keep practicing while you wait.",
              "Audio stays private; public playback links are not created.",
              "Go to Practice",
              "/practice"
            )
          : null;

  return (
    <div className="feedback-page">
      <Header user={user} title={data.header.title} subtitle={data.header.subtitle} />

      <div className="feedback-grid">
        {statusState ? (
          <FeedbackStatusCard {...statusState} />
        ) : (
          <FeedbackEmptyState emptyState={data.emptyState} />
        )}
        {isStudent && <TeacherWeeklyReviewCard review={data.weeklyReview} />}
        {isStudent && (
          <RecentFeedbackList
            feedback={data.recentFeedback}
            submissions={submissions}
            currentStudentId={profile.id}
          />
        )}
        {isStudent && <WritingFeedbackSection writing={writing} />}
        <FeedbackMethodCard method={data.method} />
        {isStudent && <CorrectionBankPreview bank={data.correctionBank} />}
        {isStudent && <NextFocusCard focus={nextFocus} />}
      </div>
    </div>
  );
}
