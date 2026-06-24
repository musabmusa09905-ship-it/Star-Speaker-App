import { useEffect, useState } from "react";
import { Header } from "../Header.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { FeedbackIcon, SendIcon } from "../icons.jsx";
import {
  getOrCreateStudentTeacherThread,
  listThreadMessages,
  markThreadMessagesRead,
  sendMessage
} from "../../lib/messages.js";

const MAX_MESSAGE_LENGTH = 1000;

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function MessageStateCard({ title, message, action, mascotType = "explaining" }) {
  const isLoading = title.toLowerCase().includes("opening") || title.toLowerCase().includes("loading");

  return (
    <section
      className={`card messages-state-card mascot-card mascot-card--compact ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="student-messages-state-title"
    >
      <div className="mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Teacher Support</p>
        <h2 id="student-messages-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
      <div className="mascot-card-visual">
        {isLoading ? (
          <img className="branded-loading-state__icon" src="/app-icon.png" alt="" decoding="async" />
        ) : (
          <MascotAnimation
            type={mascotType}
            size="small"
            motion={mascotType === "thinking" ? "thinking" : "idle"}
            label={`${title} mascot`}
          />
        )}
      </div>
    </section>
  );
}

function MessageList({ messages, currentUserId }) {
  if (!messages.length) {
    return (
      <div className="messages-empty-thread mascot-empty-state mascot-empty-state--inline">
        <MascotAnimation
          type="explaining"
          size="small"
          motion="idle"
          label="Explaining mascot for teacher support"
        />
        <p>No messages yet. Ask your teacher a focused question about your speaking practice.</p>
      </div>
    );
  }

  return (
    <div className="messages-thread-list" aria-label="Message history">
      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId;
        return (
          <article className={`message-entry ${isOwn ? "is-own" : "is-other"}`} key={message.id}>
            <div>
              <span>{isOwn ? "You" : message.sender_role === "teacher" ? "Teacher" : "Support"}</span>
              <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
            </div>
            <p>{message.body}</p>
          </article>
        );
      })}
    </div>
  );
}

export function StudentMessagesPage({ user, profile }) {
  const [state, setState] = useState({
    isLoading: profile?.role === "student",
    error: "",
    thread: null,
    teacher: null,
    hasAssignedTeacher: false,
    messages: []
  });
  const [draft, setDraft] = useState("");
  const [sendStatus, setSendStatus] = useState({
    type: "idle",
    message: ""
  });
  const isSending = sendStatus.type === "sending";

  async function loadSupportThread() {
    if (profile?.role !== "student") {
      setState({
        isLoading: false,
        error: "",
        thread: null,
        teacher: null,
        hasAssignedTeacher: false,
        messages: []
      });
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
      error: ""
    }));

    const threadResult = await getOrCreateStudentTeacherThread(profile.id);

    if (threadResult.error || !threadResult.thread) {
      setState({
        isLoading: false,
        error: threadResult.error || "",
        thread: threadResult.thread,
        teacher: threadResult.teacher,
        hasAssignedTeacher: threadResult.hasAssignedTeacher,
        messages: []
      });
      return;
    }

    await markThreadMessagesRead(threadResult.thread.id);
    const messageResult = await listThreadMessages(threadResult.thread.id);

    setState({
      isLoading: false,
      error: messageResult.error || "",
      thread: threadResult.thread,
      teacher: threadResult.teacher,
      hasAssignedTeacher: true,
      messages: messageResult.messages
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function run() {
      await loadSupportThread();

      if (!isMounted) {
        return;
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  async function handleSend(event) {
    event.preventDefault();

    if (!state.thread) {
      return;
    }

    setSendStatus({
      type: "sending",
      message: "Sending message..."
    });

    const result = await sendMessage(state.thread.id, draft);

    if (result.error) {
      setSendStatus({
        type: "error",
        message: result.error
      });
      return;
    }

    setDraft("");
    const messageResult = await listThreadMessages(state.thread.id);
    setState((current) => ({
      ...current,
      messages: messageResult.messages,
      error: messageResult.error || ""
    }));
    setSendStatus({
      type: "success",
      message: "Message sent. Your teacher will reply when available."
    });
  }

  if (profile?.role !== "student") {
    return (
      <div className="student-messages-page">
        <Header
          user={user}
          title="Teacher Support"
          subtitle="Use this space for task questions, feedback questions, and speaking support."
        />
        <MessageStateCard
          title="Teacher Support is shown for student accounts."
          message="Teachers can reply from Student Messages. Admin message overview can be added later."
        />
      </div>
    );
  }

  return (
    <div className="student-messages-page">
      <Header
        user={user}
          title="Teacher Support"
          subtitle="Use this space for focused speaking support. Your teacher will reply when available."
      />

      {state.isLoading ? (
        <MessageStateCard
          title="Opening Teacher Support..."
          message="Please wait while we open your support thread."
        />
      ) : state.error ? (
        <MessageStateCard
          title="Could not load Teacher Support."
          message={state.error}
        />
      ) : !state.hasAssignedTeacher ? (
        <MessageStateCard
          title="No teacher support thread yet."
          message="Your teacher support thread will appear after your school assigns a teacher."
          action={<a className="secondary-button" href="/profile">View Profile</a>}
          mascotType="thinking"
        />
      ) : (
        <section className="card messages-panel" aria-labelledby="teacher-support-title">
          <div className="messages-panel__header">
            <div>
              <p className="card-eyebrow card-eyebrow--red">Teacher Support</p>
              <h2 id="teacher-support-title">{state.thread?.subject || "Teacher Support"}</h2>
              <p>
                {state.teacher?.full_name
                  ? `Support thread with ${state.teacher.full_name}.`
                  : "Support thread with your assigned teacher."}
              </p>
            </div>
            <div className="messages-panel__icon" aria-hidden="true">
              <FeedbackIcon />
            </div>
          </div>

          <MessageList messages={state.messages} currentUserId={profile.id} />

          <form className="message-compose" onSubmit={handleSend}>
            <label htmlFor="student-message-body">
              Send a focused question
              <textarea
                id="student-message-body"
                value={draft}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={isSending}
                rows="4"
                onChange={(event) => {
                  setDraft(event.target.value);
                  setSendStatus({ type: "idle", message: "" });
                }}
                placeholder="Ask about your task, feedback, or speaking progress."
              />
            </label>
            <p className="message-compose__note">
              Keep your message focused on your task, feedback, or speaking progress.
            </p>
            <div className="message-compose__actions">
              <button className="primary-button" type="submit" disabled={isSending || !draft.trim()}>
                <SendIcon />
                {isSending ? "Sending..." : "Send Question"}
              </button>
              <span>{draft.trim().length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
            {sendStatus.message && (
              <p className={`message-compose__status message-compose__status--${sendStatus.type}`}>
                {sendStatus.message}
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
