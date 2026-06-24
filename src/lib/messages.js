import { requireSupabaseClient } from "./supabaseClient.js";
import { dispatchInstantNotificationQuietly } from "./instantNotifications.js";

const THREAD_COLUMNS = [
  "id",
  "student_id",
  "teacher_id",
  "status",
  "subject",
  "last_message_at",
  "created_at",
  "updated_at"
].join(", ");

const MESSAGE_COLUMNS = [
  "id",
  "thread_id",
  "sender_id",
  "sender_role",
  "body",
  "read_at",
  "created_at"
].join(", ");

const PROFILE_COLUMNS = [
  "id",
  "full_name",
  "email",
  "role",
  "status"
].join(", ");

const MAX_MESSAGE_LENGTH = 1000;

function normalizeError(error, fallback = "Could not load messages. Please try again.") {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach Supabase. Please check your connection.";
  }

  if (
    message.toLowerCase().includes("message_threads") ||
    message.toLowerCase().includes("messages") ||
    message.toLowerCase().includes("does not exist")
  ) {
    return "Teacher Support is not ready yet. Run the messaging SQL migration first.";
  }

  return fallback;
}

function cleanBody(body) {
  return String(body || "").trim();
}

function validateBody(body) {
  const cleaned = cleanBody(body);

  if (!cleaned) {
    return {
      body: "",
      error: "Write a focused message before sending."
    };
  }

  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return {
      body: cleaned,
      error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or less.`
    };
  }

  return {
    body: cleaned,
    error: null
  };
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function firstByThread(messages) {
  const map = new Map();

  (messages || []).forEach((message) => {
    if (!map.has(message.thread_id)) {
      map.set(message.thread_id, message);
    }
  });

  return map;
}

function unreadCountsByThread(messages, currentUserId) {
  return (messages || []).reduce((map, message) => {
    if (message.sender_id === currentUserId || message.read_at) {
      return map;
    }

    map.set(message.thread_id, (map.get(message.thread_id) || 0) + 1);
    return map;
  }, new Map());
}

async function getCurrentUserAndProfile(client) {
  const { data: userData, error: userError } = await client.auth.getUser();
  const user = userData?.user || null;

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      error: "Sign in again before using Teacher Support."
    };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      user,
      profile: null,
      error: normalizeError(profileError, "Could not confirm your app profile.")
    };
  }

  return {
    user,
    profile,
    error: null
  };
}

async function fetchProfiles(client, ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];

  if (!uniqueIds.length) {
    return {
      profiles: new Map(),
      error: null
    };
  }

  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", uniqueIds);

  if (error) {
    return {
      profiles: new Map(),
      error: normalizeError(error, "Could not load message profile details.")
    };
  }

  return {
    profiles: byId(data || []),
    error: null
  };
}

async function fetchAssignedTeacherForStudent(client, studentId) {
  const { data: assignments, error } = await client
    .from("teacher_students")
    .select("teacher_id, created_at")
    .eq("student_id", studentId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    return {
      teacherId: null,
      teacher: null,
      error: normalizeError(error, "Could not load your assigned teacher.")
    };
  }

  const teacherId = assignments?.[0]?.teacher_id || null;

  if (!teacherId) {
    return {
      teacherId: null,
      teacher: null,
      error: null
    };
  }

  const { profiles, error: profilesError } = await fetchProfiles(client, [teacherId]);

  return {
    teacherId,
    teacher: profiles.get(teacherId) || null,
    error: profilesError
  };
}

function attachThreadDetails({ thread, student, teacher, latestMessage = null, unreadCount = 0 }) {
  return {
    ...thread,
    student: student || null,
    teacher: teacher || null,
    latestMessage,
    unreadCount
  };
}

export async function getOrCreateStudentTeacherThread(studentId) {
  try {
    const client = requireSupabaseClient();
    const assigned = await fetchAssignedTeacherForStudent(client, studentId);

    if (assigned.error) {
      return {
        thread: null,
        teacher: null,
        hasAssignedTeacher: false,
        error: assigned.error
      };
    }

    if (!assigned.teacherId) {
      return {
        thread: null,
        teacher: null,
        hasAssignedTeacher: false,
        error: null
      };
    }

    const { data: existingThread, error: existingError } = await client
      .from("message_threads")
      .select(THREAD_COLUMNS)
      .eq("student_id", studentId)
      .eq("teacher_id", assigned.teacherId)
      .maybeSingle();

    if (existingError) {
      return {
        thread: null,
        teacher: assigned.teacher,
        hasAssignedTeacher: true,
        error: normalizeError(existingError)
      };
    }

    if (existingThread) {
      return {
        thread: attachThreadDetails({
          thread: existingThread,
          teacher: assigned.teacher
        }),
        teacher: assigned.teacher,
        hasAssignedTeacher: true,
        error: null
      };
    }

    const { data: createdThread, error: createError } = await client
      .from("message_threads")
      .insert({
        student_id: studentId,
        teacher_id: assigned.teacherId,
        subject: "Teacher Support",
        status: "open"
      })
      .select(THREAD_COLUMNS)
      .single();

    if (createError) {
      return {
        thread: null,
        teacher: assigned.teacher,
        hasAssignedTeacher: true,
        error: normalizeError(createError, "Could not create your teacher support thread.")
      };
    }

    return {
      thread: attachThreadDetails({
        thread: createdThread,
        teacher: assigned.teacher
      }),
      teacher: assigned.teacher,
      hasAssignedTeacher: true,
      error: null
    };
  } catch (error) {
    return {
      thread: null,
      teacher: null,
      hasAssignedTeacher: false,
      error: normalizeError(error)
    };
  }
}

export async function createTeacherStudentThread(studentId) {
  try {
    const client = requireSupabaseClient();
    const context = await getCurrentUserAndProfile(client);

    if (context.error) {
      return {
        thread: null,
        error: context.error
      };
    }

    if (context.profile.role !== "teacher") {
      return {
        thread: null,
        error: "Only teacher accounts can start student support threads."
      };
    }

    const { data: assignment, error: assignmentError } = await client
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", context.user.id)
      .eq("student_id", studentId)
      .eq("active", true)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return {
        thread: null,
        error: assignmentError
          ? normalizeError(assignmentError, "Could not verify this student assignment.")
          : "You can only message students assigned to you."
      };
    }

    const { data: existingThread, error: existingError } = await client
      .from("message_threads")
      .select(THREAD_COLUMNS)
      .eq("teacher_id", context.user.id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingError) {
      return {
        thread: null,
        error: normalizeError(existingError)
      };
    }

    if (existingThread) {
      return {
        thread: existingThread,
        error: null
      };
    }

    const { data, error } = await client
      .from("message_threads")
      .insert({
        student_id: studentId,
        teacher_id: context.user.id,
        subject: "Teacher Support",
        status: "open"
      })
      .select(THREAD_COLUMNS)
      .single();

    return {
      thread: data || null,
      error: normalizeError(error, "Could not start this support thread.")
    };
  } catch (error) {
    return {
      thread: null,
      error: normalizeError(error)
    };
  }
}

export async function listStudentThreads() {
  try {
    const client = requireSupabaseClient();
    const context = await getCurrentUserAndProfile(client);

    if (context.error) {
      return {
        threads: [],
        error: context.error
      };
    }

    const { data: threads, error } = await client
      .from("message_threads")
      .select(THREAD_COLUMNS)
      .eq("student_id", context.user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      return {
        threads: [],
        error: normalizeError(error)
      };
    }

    const { profiles } = await fetchProfiles(
      client,
      (threads || []).flatMap((thread) => [thread.student_id, thread.teacher_id])
    );

    return {
      threads: (threads || []).map((thread) =>
        attachThreadDetails({
          thread,
          student: profiles.get(thread.student_id) || context.profile,
          teacher: profiles.get(thread.teacher_id) || null
        })
      ),
      error: null
    };
  } catch (error) {
    return {
      threads: [],
      error: normalizeError(error)
    };
  }
}

export async function listTeacherThreads() {
  try {
    const client = requireSupabaseClient();
    const context = await getCurrentUserAndProfile(client);

    if (context.error) {
      return {
        items: [],
        hasAssignedStudents: false,
        error: context.error
      };
    }

    if (context.profile.role !== "teacher") {
      return {
        items: [],
        hasAssignedStudents: false,
        error: "Student Messages are only available for teacher accounts."
      };
    }

    const { data: assignments, error: assignmentsError } = await client
      .from("teacher_students")
      .select("student_id, created_at")
      .eq("teacher_id", context.user.id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (assignmentsError) {
      return {
        items: [],
        hasAssignedStudents: false,
        error: normalizeError(assignmentsError, "Could not load assigned students.")
      };
    }

    const studentIds = [...new Set((assignments || []).map((item) => item.student_id))];

    if (!studentIds.length) {
      return {
        items: [],
        hasAssignedStudents: false,
        error: null
      };
    }

    const [
      { profiles: studentProfiles, error: profileError },
      { data: threads, error: threadsError }
    ] = await Promise.all([
      fetchProfiles(client, studentIds),
      client
        .from("message_threads")
        .select(THREAD_COLUMNS)
        .eq("teacher_id", context.user.id)
        .in("student_id", studentIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    ]);

    if (profileError || threadsError) {
      return {
        items: [],
        hasAssignedStudents: true,
        error: profileError || normalizeError(threadsError)
      };
    }

    const threadIds = (threads || []).map((thread) => thread.id);
    let latestByThread = new Map();
    let unreadByThread = new Map();

    if (threadIds.length) {
      const { data: threadMessages, error: messagesError } = await client
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      if (messagesError) {
        return {
          items: [],
          hasAssignedStudents: true,
          error: normalizeError(messagesError)
        };
      }

      latestByThread = firstByThread(threadMessages || []);
      unreadByThread = unreadCountsByThread(threadMessages || [], context.user.id);
    }

    const threadByStudentId = new Map((threads || []).map((thread) => [thread.student_id, thread]));
    const items = studentIds.map((studentId) => {
      const thread = threadByStudentId.get(studentId) || null;
      return {
        student: studentProfiles.get(studentId) || { id: studentId, full_name: "Student" },
        thread,
        latestMessage: thread ? latestByThread.get(thread.id) || null : null,
        unreadCount: thread ? unreadByThread.get(thread.id) || 0 : 0
      };
    });

    items.sort((a, b) => {
      const aTime = new Date(a.thread?.last_message_at || a.thread?.created_at || 0).getTime();
      const bTime = new Date(b.thread?.last_message_at || b.thread?.created_at || 0).getTime();

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return (a.student.full_name || "").localeCompare(b.student.full_name || "");
    });

    return {
      items,
      hasAssignedStudents: true,
      error: null
    };
  } catch (error) {
    return {
      items: [],
      hasAssignedStudents: false,
      error: normalizeError(error)
    };
  }
}

export async function listThreadMessages(threadId) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    return {
      messages: data || [],
      error: normalizeError(error)
    };
  } catch (error) {
    return {
      messages: [],
      error: normalizeError(error)
    };
  }
}

export async function sendMessage(threadId, body) {
  try {
    const validation = validateBody(body);

    if (validation.error) {
      return {
        message: null,
        error: validation.error
      };
    }

    const client = requireSupabaseClient();
    const context = await getCurrentUserAndProfile(client);

    if (context.error) {
      return {
        message: null,
        error: context.error
      };
    }

    if (!["student", "teacher", "admin"].includes(context.profile.role)) {
      return {
        message: null,
        error: "This account cannot send support messages."
      };
    }

    const { data, error } = await client
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: context.user.id,
        sender_role: context.profile.role,
        body: validation.body
      })
      .select(MESSAGE_COLUMNS)
      .single();

    const sendError = normalizeError(error, "Could not send your message. Please try again.");

    if (data?.id && !sendError) {
      dispatchInstantNotificationQuietly({
        eventType: "message_sent",
        sourceId: data.id
      });
    }

    return {
      message: data || null,
      error: sendError
    };
  } catch (error) {
    return {
      message: null,
      error: normalizeError(error, "Could not send your message. Please try again.")
    };
  }
}

export async function markThreadMessagesRead(threadId) {
  try {
    const client = requireSupabaseClient();
    const context = await getCurrentUserAndProfile(client);

    if (context.error) {
      return {
        error: context.error
      };
    }

    const { error } = await client
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .neq("sender_id", context.user.id)
      .is("read_at", null);

    return {
      error: normalizeError(error, "Could not mark messages as read.")
    };
  } catch (error) {
    return {
      error: normalizeError(error, "Could not mark messages as read.")
    };
  }
}

export async function getUnreadMessageCountForCurrentUser() {
  try {
    const client = requireSupabaseClient();
    const context = await getCurrentUserAndProfile(client);

    if (context.error || !["student", "teacher"].includes(context.profile.role)) {
      return {
        count: 0,
        error: null
      };
    }

    const threadQuery = client
      .from("message_threads")
      .select("id");

    const { data: threads, error: threadError } =
      context.profile.role === "student"
        ? await threadQuery.eq("student_id", context.user.id)
        : await threadQuery.eq("teacher_id", context.user.id);

    if (threadError || !threads?.length) {
      return {
        count: 0,
        error: null
      };
    }

    const threadIds = threads.map((thread) => thread.id);
    const { count, error } = await client
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .neq("sender_id", context.user.id)
      .is("read_at", null);

    return {
      count: error ? 0 : count || 0,
      error: null
    };
  } catch {
    return {
      count: 0,
      error: null
    };
  }
}

export async function getTeacherUnreadSummary() {
  const result = await listTeacherThreads();

  return {
    unreadTotal: (result.items || []).reduce((total, item) => total + (item.unreadCount || 0), 0),
    items: result.items || [],
    error: result.error
  };
}
