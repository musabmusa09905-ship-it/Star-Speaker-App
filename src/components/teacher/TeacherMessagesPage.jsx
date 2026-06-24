import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { FeedbackIcon, ProfileIcon, SendIcon } from "../icons.jsx";
import {
  createTeacherStudentThread,
  listTeacherThreads,
  listThreadMessages,
  markThreadMessagesRead,
  sendMessage
} from "../../lib/messages.js";

const MAX_MESSAGE_LENGTH = 1000;

function formatDateTime(value) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function preview(value) {
  if (!value) {
    return "No messages yet.";
  }

  return value.length > 96 ? `${value.slice(0, 96).trim()}...` : value;
}

function TeacherMessagesState({ title, message, action }) {
  return (
    <section className="card messages-state-card" aria-labelledby="teacher-messages-state-title">
      <div className="messages-state-card__icon" aria-hidden="true">
        <FeedbackIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Student Messages</p>
        <h2 id="teacher-messages-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function TeacherThreadList({ items, selectedThreadId, onSelect, onStartThread, isStartingThread }) {
  return (
    <section className="card teacher-message-list-card" aria-labelledby="teacher-thread-list-title">
      <div className="messages-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Assigned students</p>
          <h2 id="teacher-thread-list-title">Support Threads</h2>
        </div>
        <span>{items.length} students</span>
      </div>

      <div className="teacher-message-thread-list">
        {items.map((item) => {
          const isSelected = item.thread?.id === selectedThreadId;
          return (
            <article className={`teacher-thread-row ${isSelected ? "is-selected" : ""}`} key={item.student.id}>
              <button
                type="button"
                disabled={!item.thread}
                onClick={() => item.thread && onSelect(item)}
              >
                <span className="teacher-thread-row__avatar" aria-hidden="true">
                  {(item.student.full_name || item.student.email || "S").charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>{item.student.full_name || "Student"}</strong>
                  <small>{preview(item.latestMessage?.body)}</small>
                  <em>{formatDateTime(item.latestMessage?.created_at || item.thread?.created_at)}</em>
                </span>
                {item.unreadCount > 0 && <b>{item.unreadCount}</b>}
              </button>

              {!item.thread && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isStartingThread}
                  onClick={() => onStartThread(item.student.id)}
                >
                  Start support thread
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TeacherMessageList({ messages, currentUserId }) {
  if (!messages.length) {
    return (
      <div className="messages-empty-thread">
        <p>No messages yet. This support thread is ready when the student has a question.</p>
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
              <span>{isOwn ? "You" : message.sender_role === "student" ? "Student" : "Support"}</span>
              <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
            </div>
            <p>{message.body}</p>
          </article>
        );
      })}
    </div>
  );
}

export function TeacherMessagesPage({ user, profile }) {
  const [state, setState] = useState({
    isLoading: profile?.role === "teacher",
    error: "",
    items: [],
    hasAssignedStudents: false
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sendStatus, setSendStatus] = useState({
    type: "idle",
    message: ""
  });
  const isSending = sendStatus.type === "sending";
  const isStartingThread = sendStatus.type === "starting";

  async function loadThreads({ keepSelected = true } = {}) {
    if (profile?.role !== "teacher") {
      setState({
        isLoading: false,
        error: "",
        items: [],
        hasAssignedStudents: false
      });
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
      error: ""
    }));

    const result = await listTeacherThreads();

    setState({
      isLoading: false,
      error: result.error || "",
      items: result.items || [],
      hasAssignedStudents: result.hasAssignedStudents
    });

    if (!result.error && keepSelected && selectedItem?.thread) {
      const refreshed = (result.items || []).find((item) => item.thread?.id === selectedItem.thread.id);
      if (refreshed) {
        setSelectedItem(refreshed);
      }
    }
  }

  async function openThread(item) {
    if (!item.thread) {
      return;
    }

    setSelectedItem(item);
    setSendStatus({
      type: "idle",
      message: ""
    });

    await markThreadMessagesRead(item.thread.id);
    const messageResult = await listThreadMessages(item.thread.id);
    setMessages(messageResult.messages);

    if (messageResult.error) {
      setSendStatus({
        type: "error",
        message: messageResult.error
      });
    }
  }

  useEffect(() => {
    loadThreads({ keepSelected: false });
  }, [profile?.id, profile?.role]);

  const existingThreadItems = useMemo(
    () => state.items.filter((item) => item.thread),
    [state.items]
  );

  useEffect(() => {
    if (!selectedItem && existingThreadItems.length) {
      openThread(existingThreadItems[0]);
    }
  }, [existingThreadItems, selectedItem]);

  async function handleStartThread(studentId) {
    setSendStatus({
      type: "starting",
      message: "Starting support thread..."
    });

    const result = await createTeacherStudentThread(studentId);

    if (result.error || !result.thread) {
      setSendStatus({
        type: "error",
        message: result.error || "Could not start support thread."
      });
      return;
    }

    const refreshed = await listTeacherThreads();
    setState({
      isLoading: false,
      error: refreshed.error || "",
      items: refreshed.items || [],
      hasAssignedStudents: refreshed.hasAssignedStudents
    });

    const item = (refreshed.items || []).find((candidate) => candidate.thread?.id === result.thread.id);
    if (item) {
      await openThread(item);
    }

    setSendStatus({
      type: "success",
      message: "Support thread is ready."
    });
  }

  async function handleSend(event) {
    event.preventDefault();

    if (!selectedItem?.thread) {
      return;
    }

    setSendStatus({
      type: "sending",
      message: "Sending reply..."
    });

    const result = await sendMessage(selectedItem.thread.id, draft);

    if (result.error) {
      setSendStatus({
        type: "error",
        message: result.error
      });
      return;
    }

    setDraft("");
    const messageResult = await listThreadMessages(selectedItem.thread.id);
    setMessages(messageResult.messages);
    await loadThreads();
    setSendStatus({
      type: "success",
      message: "Reply sent."
    });
  }

  if (profile?.role === "student") {
    return (
      <div className="teacher-messages-page">
        <Header
          user={user}
          title="Student Messages"
          subtitle="Reply to focused student questions about tasks, feedback, and speaking progress."
        />
        <TeacherMessagesState
          title="Student Messages are only available for teacher accounts."
          message="Students can contact their assigned teacher from Teacher Support."
        />
      </div>
    );
  }

  if (profile?.role === "admin") {
    return (
      <div className="teacher-messages-page">
        <Header
          user={user}
          title="Student Messages"
          subtitle="Reply to focused student questions about tasks, feedback, and speaking progress."
        />
        <TeacherMessagesState
          title="Message overview tools can be added later."
          message="This MVP keeps full conversations between assigned teachers and students."
        />
      </div>
    );
  }

  return (
    <div className="teacher-messages-page">
      <Header
        user={user}
        title="Student Messages"
        subtitle="Reply to focused student questions about tasks, feedback, and speaking progress."
      />

      {state.isLoading ? (
        <TeacherMessagesState
          title="Loading student messages..."
          message="Please wait while we open your assigned student support threads."
        />
      ) : state.error ? (
        <TeacherMessagesState
          title="Could not load Student Messages."
          message={state.error}
        />
      ) : !state.hasAssignedStudents ? (
        <TeacherMessagesState
          title="No assigned students yet."
          message="Student support threads will appear after students are linked to your teacher account."
          action={<a className="secondary-button" href="/teacher/students">View Students</a>}
        />
      ) : !state.items.length ? (
        <TeacherMessagesState
          title="No student messages yet."
          message="Support threads will appear here after your assigned students send focused questions."
        />
      ) : (
        <div className="teacher-messages-layout">
          <TeacherThreadList
            items={state.items}
            selectedThreadId={selectedItem?.thread?.id}
            onSelect={openThread}
            onStartThread={handleStartThread}
            isStartingThread={isStartingThread}
          />

          <section className="card messages-panel" aria-labelledby="teacher-message-thread-title">
            {selectedItem?.thread ? (
              <>
                <div className="messages-panel__header">
                  <div>
                    <p className="card-eyebrow card-eyebrow--red">Support thread</p>
                    <h2 id="teacher-message-thread-title">
                      {selectedItem.student.full_name || "Student"}
                    </h2>
                    <p>Keep replies focused on speaking tasks, feedback, and progress.</p>
                  </div>
                  <div className="messages-panel__icon" aria-hidden="true">
                    <ProfileIcon />
                  </div>
                </div>

                <TeacherMessageList messages={messages} currentUserId={profile.id} />

                <form className="message-compose" onSubmit={handleSend}>
                  <label htmlFor="teacher-message-body">
                    Reply to student
                    <textarea
                      id="teacher-message-body"
                      value={draft}
                      maxLength={MAX_MESSAGE_LENGTH}
                      disabled={isSending}
                      rows="4"
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setSendStatus({ type: "idle", message: "" });
                      }}
                      placeholder="Give a focused answer or next step."
                    />
                  </label>
                  <p className="message-compose__note">
                    Keep your message focused on the student's task, feedback, or speaking progress.
                  </p>
                  <div className="message-compose__actions">
                    <button className="primary-button" type="submit" disabled={isSending || !draft.trim()}>
                      <SendIcon />
                      {isSending ? "Sending..." : "Send Message"}
                    </button>
                    <span>{draft.trim().length}/{MAX_MESSAGE_LENGTH}</span>
                  </div>
                  {sendStatus.message && (
                    <p className={`message-compose__status message-compose__status--${sendStatus.type}`}>
                      {sendStatus.message}
                    </p>
                  )}
                </form>
              </>
            ) : (
              <div className="messages-empty-thread">
                <p>Select a student support thread to read and reply.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
