import { useEffect, useRef, useState } from "react";
import { AppShell } from "./components/AppShell.jsx";
import { AdminLibraryPage } from "./components/admin/AdminLibraryPage.jsx";
import { AdminTeacherLinksPage } from "./components/admin/AdminTeacherLinksPage.jsx";
import { AdminUsersPage } from "./components/admin/AdminUsersPage.jsx";
import { MascotPreviewPage } from "./components/admin/MascotPreviewPage.jsx";
import { DropOffAnalyticsPage } from "./components/analytics/DropOffAnalyticsPage.jsx";
import { AuthStatusScreen } from "./components/auth/AuthStatusScreen.jsx";
import { LoginPage } from "./components/auth/LoginPage.jsx";
import { AppOpeningAnimation } from "./components/common/AppOpeningAnimation.jsx";
import { AppRouteTransition } from "./components/common/AppRouteTransition.jsx";
import { FeedbackPage } from "./components/feedback/FeedbackPage.jsx";
import { ConsistencyBoardPage } from "./components/leaderboard/ConsistencyBoardPage.jsx";
import { LibraryPage } from "./components/library/LibraryPage.jsx";
import { PracticePage } from "./components/practice/PracticePage.jsx";
import { ProfilePage } from "./components/profile/ProfilePage.jsx";
import { ProgressPage } from "./components/progress/ProgressPage.jsx";
import { RecordPage } from "./components/record/RecordPage.jsx";
import { DailyRemindersPage } from "./components/reminders/DailyRemindersPage.jsx";
import { StudentMessagesPage } from "./components/student/StudentMessagesPage.jsx";
import { DailyTaskPlannerPage } from "./components/teacher/DailyTaskPlannerPage.jsx";
import { SmartTaskBuilderPage } from "./components/teacher/SmartTaskBuilderPage.jsx";
import { TeacherAssignPage } from "./components/teacher/TeacherAssignPage.jsx";
import { TeacherMessagesPage } from "./components/teacher/TeacherMessagesPage.jsx";
import { TeacherReviewPage } from "./components/teacher/TeacherReviewPage.jsx";
import { TeacherStudentsPage } from "./components/teacher/TeacherStudentsPage.jsx";
import { TeacherTasksPage } from "./components/teacher/TeacherTasksPage.jsx";
import { TeacherWeeklyFocusPage } from "./components/teacher/TeacherWeeklyFocusPage.jsx";
import { WritingPage } from "./components/writing/WritingPage.jsx";
import { StudentHomePage } from "./components/StudentHomePage.jsx";
import { mockFeedbackData } from "./data/mockFeedbackData.js";
import { mockPracticeData } from "./data/mockPracticeData.js";
import { mockProfileData } from "./data/mockProfileData.js";
import { mockRecordTaskData } from "./data/mockRecordTaskData.js";
import { mockStudentHomeData } from "./data/mockStudentHomeData.js";
import { getCurrentAuthState, signOut, subscribeToAuthChanges } from "./lib/auth.js";
import { getUnreadMessageCountForCurrentUser } from "./lib/messages.js";
import { getNavBadgeCounts } from "./lib/navBadgeCounts.js";
import { isAdminLike } from "./lib/rolePermissions.js";
import {
  STUDENT_ACTIVITY_EVENT_TYPES,
  logStudentActivityEventQuietly
} from "./lib/studentActivityEvents.js";

const appPaths = [
  "/",
  "/home",
  "/practice",
  "/writing",
  "/record",
  "/feedback",
  "/messages",
  "/leaderboard",
  "/analytics",
  "/progress",
  "/library",
  "/profile",
  "/teacher/assign",
  "/teacher/daily-planner",
  "/daily-reminders",
  "/teacher/smart-builder",
  "/teacher/messages",
  "/teacher/review",
  "/teacher/students",
  "/teacher/tasks",
  "/teacher/weekly-focus",
  "/teacher/library",
  "/admin/library",
  "/admin/daily-planner",
  "/admin/smart-builder",
  "/admin/mascots-preview",
  "/admin/users",
  "/admin/add-users",
  "/admin/relationships",
  "/admin/teacher-links",
  "/login"
];

const studentRouteLabels = {
  home: "Opening your home...",
  practice: "Opening your practice...",
  writing: "Opening writing practice...",
  record: "Opening your recording space...",
  feedback: "Opening your feedback...",
  messages: "Opening teacher support...",
  leaderboard: "Opening consistency board...",
  progress: "Opening your progress...",
  library: "Opening your library...",
  profile: "Opening your profile..."
};

function isStudentDashboardRoute(route) {
  return Object.prototype.hasOwnProperty.call(studentRouteLabels, route);
}

function getDefaultAuthenticatedPath(profile) {
  if (profile?.role === "teacher") {
    return "/teacher/review";
  }

  if (isAdminLike(profile)) {
    return "/admin/users";
  }

  return "/";
}

function getCurrentRoute() {
  if (window.location.pathname === "/login") {
    return "login";
  }

  if (window.location.pathname === "/home") {
    return "home";
  }

  if (window.location.pathname === "/practice") {
    return "practice";
  }

  if (window.location.pathname === "/writing") {
    return "writing";
  }

  if (window.location.pathname === "/record") {
    return "record";
  }

  if (window.location.pathname === "/feedback") {
    return "feedback";
  }

  if (window.location.pathname === "/messages") {
    return "messages";
  }

  if (window.location.pathname === "/leaderboard") {
    return "leaderboard";
  }

  if (window.location.pathname === "/analytics") {
    return "analytics";
  }

  if (window.location.pathname === "/progress") {
    return "progress";
  }

  if (window.location.pathname === "/library") {
    return "library";
  }

  if (window.location.pathname === "/profile") {
    return "profile";
  }

  if (window.location.pathname === "/teacher/review") {
    return "teacher-review";
  }

  if (window.location.pathname === "/teacher/messages") {
    return "teacher-messages";
  }

  if (window.location.pathname === "/teacher/students") {
    return "teacher-students";
  }

  if (window.location.pathname === "/teacher/assign") {
    return "teacher-assign";
  }

  if (window.location.pathname === "/teacher/daily-planner") {
    return "teacher-daily-planner";
  }

  if (window.location.pathname === "/daily-reminders") {
    return "daily-reminders";
  }

  if (window.location.pathname === "/teacher/smart-builder") {
    return "teacher-smart-builder";
  }

  if (window.location.pathname === "/teacher/tasks") {
    return "teacher-tasks";
  }

  if (window.location.pathname === "/teacher/weekly-focus") {
    return "teacher-weekly-focus";
  }

  if (window.location.pathname === "/teacher/library") {
    return "teacher-library";
  }

  if (window.location.pathname === "/admin/users") {
    return "admin-users";
  }

  if (window.location.pathname === "/admin/add-users") {
    return "admin-add-users";
  }

  if (window.location.pathname === "/admin/library") {
    return "admin-library";
  }

  if (window.location.pathname === "/admin/daily-planner") {
    return "admin-daily-planner";
  }

  if (window.location.pathname === "/admin/smart-builder") {
    return "admin-smart-builder";
  }

  if (window.location.pathname === "/admin/mascots-preview") {
    return "admin-mascots-preview";
  }

  if (window.location.pathname === "/admin/relationships" || window.location.pathname === "/admin/teacher-links") {
    return "admin-relationships";
  }

  return "home";
}

function getActiveTab() {
  if (window.location.pathname === "/login") {
    return "";
  }

  const hash = window.location.hash.replace("#", "").toLowerCase();
  const activeItem = mockStudentHomeData.navItems.find(
    (item) => item.label.toLowerCase() === hash
  );

  if (activeItem) {
    return activeItem.label;
  }

  const route = getCurrentRoute();

  if (route === "practice") {
    return "Practice";
  }

  if (route === "writing") {
    return "Writing";
  }

  if (route === "record") {
    return "Record";
  }

  if (route === "feedback") {
    return "Feedback";
  }

  if (route === "messages") {
    return "Messages";
  }

  if (route === "leaderboard") {
    return "Consistency Board";
  }

  if (route === "analytics") {
    return "Analytics";
  }

  if (route === "progress") {
    return "Progress";
  }

  if (route === "library") {
    return "Library";
  }

  if (route === "profile") {
    return "Profile";
  }

  if (route === "teacher-review") {
    return "Review";
  }

  if (route === "teacher-messages") {
    return "Messages";
  }

  if (route === "teacher-assign") {
    return "Assign Task";
  }

  if (route === "teacher-smart-builder") {
    return "Smart Builder";
  }

  if (route === "teacher-daily-planner") {
    return "Daily Planner";
  }

  if (route === "daily-reminders") {
    return "Daily Reminders";
  }

  if (route === "teacher-students") {
    return "Students";
  }

  if (route === "teacher-tasks") {
    return "Task History";
  }

  if (route === "teacher-weekly-focus") {
    return "Weekly Focus";
  }

  if (route === "teacher-library") {
    return "Library";
  }

  if (route === "admin-users") {
    return "Users";
  }

  if (route === "admin-add-users") {
    return "Add Users";
  }

  if (route === "admin-library") {
    return "Library";
  }

  if (route === "admin-smart-builder") {
    return "Smart Builder";
  }

  if (route === "admin-daily-planner") {
    return "Daily Planner";
  }

  if (route === "admin-mascots-preview") {
    return "Mascot Preview";
  }

  if (route === "admin-relationships") {
    return "Teacher Links";
  }

  return "Home";
}

function toTitleCase(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(profile) {
  const name = profile?.full_name?.trim();

  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  return profile?.email?.charAt(0)?.toUpperCase() || "S";
}

function getShellUser(profile, unreadMessageCount = 0) {
  if (!profile) {
    return mockStudentHomeData.user;
  }

  return {
    ...mockStudentHomeData.user,
    name: profile.full_name || null,
    initials: getInitials(profile),
    avatarUrl: profile.avatar_url || null,
    role: `${toTitleCase(profile.role)} account`,
    email: profile.email,
    status: profile.status,
    notifications: unreadMessageCount
  };
}

function getNavItems(profile, unreadMessageCount = 0, navBadgeCounts = {}) {
  if (profile?.role === "student") {
    return [
      { label: "Home", href: "/", icon: "home" },
      { label: "Practice", href: "/practice", icon: "target", badge: navBadgeCounts.practice, badgeLabel: "pending speaking tasks" },
      { label: "Record", href: "/record", icon: "mic", primary: true, badge: navBadgeCounts.record, badgeLabel: "recordings still open" },
      { label: "Feedback", href: "/feedback", icon: "feedback" },
      { label: "Messages", href: "/messages", icon: "messages", badge: unreadMessageCount },
      { label: "Library", href: "/library", icon: "book" },
      { label: "Consistency Board", href: "/leaderboard", icon: "progress", mobileLabel: "Board" },
      { label: "Progress", href: "/progress", icon: "progress" },
      { label: "Profile", href: "/profile", icon: "profile" }
    ];
  }

  if (profile?.role === "teacher") {
    return [
      { label: "Review", href: "/teacher/review", icon: "feedback", badge: navBadgeCounts.review, badgeLabel: "speaking submissions awaiting review" },
      { label: "Messages", href: "/teacher/messages", icon: "messages", badge: unreadMessageCount },
      { label: "Daily Planner", href: "/teacher/daily-planner", icon: "calendar" },
      { label: "Daily Reminders", href: "/daily-reminders", icon: "bell", mobileLabel: "Reminders", badge: navBadgeCounts.dailyReminders, badgeLabel: "students needing reminders" },
      { label: "Analytics", href: "/analytics", icon: "progress" },
      { label: "Task History", href: "/teacher/tasks", icon: "article", badge: navBadgeCounts.tasks, badgeLabel: "open assigned tasks" },
      { label: "Weekly Focus", href: "/teacher/weekly-focus", icon: "calendar" },
      { label: "Library", href: "/teacher/library", icon: "book" },
      { label: "Students", href: "/teacher/students", icon: "profile" },
      { label: "Consistency Board", href: "/leaderboard", icon: "progress", mobileLabel: "Board" },
      { label: "Profile", href: "/profile", icon: "profile" }
    ];
  }

  if (isAdminLike(profile)) {
    return [
      { label: "Users", href: "/admin/users", icon: "profile" },
      { label: "Add Users", href: "/admin/add-users", icon: "profile", mobileLabel: "Add" },
      ...(profile?.role === "admin"
        ? [{ label: "Library", href: "/admin/library", icon: "book" }]
        : []),
      { label: "Daily Planner", href: "/admin/daily-planner", icon: "calendar" },
      ...(profile?.role === "admin"
        ? [{ label: "Daily Reminders", href: "/daily-reminders", icon: "bell", mobileLabel: "Reminders", badge: navBadgeCounts.dailyReminders, badgeLabel: "students needing reminders" }]
        : []),
      { label: "Analytics", href: "/analytics", icon: "progress" },
      { label: "Teacher Links", href: "/admin/teacher-links", icon: "target" },
      { label: "Consistency Board", href: "/leaderboard", icon: "progress", mobileLabel: "Board" },
      { label: "Profile", href: "/profile", icon: "profile" }
    ];
  }

  return [
    { label: "Profile", href: "/profile", icon: "profile" }
  ];
}

export default function App() {
  const [activeTab, setActiveTab] = useState(getActiveTab);
  const [route, setRoute] = useState(getCurrentRoute);
  const [authState, setAuthState] = useState({
    loading: true,
    session: null,
    user: null,
    profile: null,
    error: null,
    profileError: null
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [navBadgeCounts, setNavBadgeCounts] = useState({});
  const [routeTransition, setRouteTransition] = useState({
    isVisible: false,
    label: "Loading your space..."
  });
  const previousRouteRef = useRef(route);

  const updateNavigationState = () => {
    setActiveTab(getActiveTab());
    setRoute(getCurrentRoute());
  };

  const navigateTo = (path, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }

    updateNavigationState();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function refreshAuthState() {
    const nextAuthState = await getCurrentAuthState();
    setAuthState({
      loading: false,
      ...nextAuthState
    });

    return nextAuthState;
  }

  async function handleLoginSuccess(nextAuthState) {
    setAuthState({
      loading: false,
      ...nextAuthState
    });

    if (nextAuthState.profile?.status === "active") {
      navigateTo(getDefaultAuthenticatedPath(nextAuthState.profile), { replace: true });
    }
  }

  async function handleLogout() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setAuthState({
      loading: false,
      session: null,
      user: null,
      profile: null,
      error: null,
      profileError: null
    });
    navigateTo("/login", { replace: true });
  }

  function handleProfileUpdated(nextProfile) {
    setAuthState((current) => ({
      ...current,
      profile: nextProfile
    }));
  }

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.origin !== window.location.origin) {
        return;
      }

      if (appPaths.includes(link.pathname)) {
        event.preventDefault();
        window.history.pushState({}, "", `${link.pathname}${link.search}${link.hash}`);
        updateNavigationState();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("hashchange", updateNavigationState);
    window.addEventListener("popstate", updateNavigationState);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      window.removeEventListener("hashchange", updateNavigationState);
      window.removeEventListener("popstate", updateNavigationState);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCurrentAuthState().then((nextAuthState) => {
      if (isMounted) {
        setAuthState({
          loading: false,
          ...nextAuthState
        });
      }
    });

    const unsubscribe = subscribeToAuthChanges(() => {
      refreshAuthState();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authState.loading) {
      return;
    }

    if (!authState.session && route !== "login") {
      navigateTo("/login", { replace: true });
      return;
    }

    if (authState.session && authState.profile?.status === "active") {
      const defaultPath = getDefaultAuthenticatedPath(authState.profile);
      const isUnknownPath = !appPaths.includes(window.location.pathname);
      const isSharedHomePath = ["/", "/home"].includes(window.location.pathname);

      if (route === "login" || isUnknownPath || (authState.profile.role !== "student" && isSharedHomePath)) {
        navigateTo(defaultPath, { replace: true });
      }
    }
  }, [authState.loading, authState.session, authState.profile, route]);

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadMessages() {
      if (
        authState.loading ||
        !authState.session ||
        authState.profile?.status !== "active" ||
        !["student", "teacher"].includes(authState.profile?.role)
      ) {
        setUnreadMessageCount(0);
        return;
      }

      const result = await getUnreadMessageCountForCurrentUser();

      if (isMounted) {
        setUnreadMessageCount(result.count || 0);
      }
    }

    loadUnreadMessages();

    return () => {
      isMounted = false;
    };
  }, [authState.loading, authState.session, authState.profile?.id, authState.profile?.role, authState.profile?.status, route]);

  useEffect(() => {
    let isMounted = true;

    async function loadNavBadges() {
      if (
        authState.loading ||
        !authState.session ||
        authState.profile?.status !== "active"
      ) {
        setNavBadgeCounts({});
        return;
      }

      const result = await getNavBadgeCounts(authState.profile);

      if (isMounted) {
        setNavBadgeCounts(result.counts || {});
      }
    }

    loadNavBadges();

    return () => {
      isMounted = false;
    };
  }, [authState.loading, authState.session, authState.profile?.id, authState.profile?.role, authState.profile?.status, route]);

  useEffect(() => {
    if (
      authState.loading ||
      !authState.session ||
      authState.profile?.role !== "student" ||
      authState.profile?.status !== "active"
    ) {
      return;
    }

    const todayKey = new Date().toISOString().slice(0, 10);

    logStudentActivityEventQuietly({
      profile: authState.profile,
      eventType: STUDENT_ACTIVITY_EVENT_TYPES.appOpened,
      dedupeKey: todayKey,
      metadata: {
        source: "app_shell"
      }
    });
  }, [authState.loading, authState.session, authState.profile]);

  useEffect(() => {
    const previousRoute = previousRouteRef.current;
    previousRouteRef.current = route;

    if (
      authState.profile?.role !== "student" ||
      previousRoute === route ||
      !isStudentDashboardRoute(previousRoute) ||
      !isStudentDashboardRoute(route)
    ) {
      setRouteTransition((current) =>
        current.isVisible
          ? {
              ...current,
              isVisible: false
            }
          : current
      );
      return undefined;
    }

    setRouteTransition({
      isVisible: true,
      label: studentRouteLabels[route] || "Loading your space..."
    });

    const timer = window.setTimeout(() => {
      setRouteTransition((current) => ({
        ...current,
        isVisible: false
      }));
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authState.profile?.role, route]);

  if (authState.loading) {
    return (
      <AuthStatusScreen
        isLoading
        title="Checking your session"
        message="Please wait while we confirm your Heart of English account."
      />
    );
  }

  if (!authState.session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (authState.error) {
    return (
      <AuthStatusScreen
        title="Authentication issue"
        message="We could not confirm your session."
        detail={authState.error}
        actionLabel={isSigningOut ? "Signing out..." : "Back to login"}
        onAction={handleLogout}
      />
    );
  }

  if (authState.profileError) {
    return (
      <AuthStatusScreen
        title="Profile could not be loaded"
        message="Your login worked, but your profile row could not be read."
        detail={authState.profileError}
        actionLabel={isSigningOut ? "Signing out..." : "Sign out"}
        onAction={handleLogout}
      />
    );
  }

  if (!authState.profile) {
    return (
      <AuthStatusScreen
        title="Profile not connected"
        message="Your Auth account exists, but there is no matching row in public.profiles yet."
        detail="Ask an admin to connect your profile before using the app."
        actionLabel={isSigningOut ? "Signing out..." : "Sign out"}
        onAction={handleLogout}
      />
    );
  }

  if (authState.profile.status !== "active") {
    return (
      <AuthStatusScreen
        title="Account not active yet"
        message="Your account exists, but it is not active."
        detail={`Current status: ${authState.profile.status}. Ask your school team to activate your profile.`}
        actionLabel={isSigningOut ? "Signing out..." : "Sign out"}
        onAction={handleLogout}
      />
    );
  }

  if (route === "login") {
    return (
      <AuthStatusScreen
        isLoading
        title="Opening your home"
        message="You are signed in. Taking you back to the app."
      />
    );
  }

  const shellUser = getShellUser(authState.profile, unreadMessageCount);
  const shellNavItems = getNavItems(authState.profile, unreadMessageCount, navBadgeCounts);

  return (
    <AppShell
      activeTab={activeTab}
      navItems={shellNavItems}
      user={shellUser}
    >
      <AppOpeningAnimation enabled={authState.profile?.role === "student"} />
      <AppRouteTransition
        isVisible={routeTransition.isVisible}
        label={routeTransition.label}
      />
      {route === "profile" ? (
        <ProfilePage
          data={mockProfileData}
          user={shellUser}
          profile={authState.profile}
          onProfileUpdated={handleProfileUpdated}
          onLogout={handleLogout}
          isSigningOut={isSigningOut}
        />
      ) : route === "library" ? (
        <LibraryPage user={shellUser} profile={authState.profile} />
      ) : route === "leaderboard" ? (
        <ConsistencyBoardPage user={shellUser} profile={authState.profile} />
      ) : route === "analytics" ? (
        <DropOffAnalyticsPage user={shellUser} profile={authState.profile} />
      ) : route === "writing" ? (
        <WritingPage user={shellUser} profile={authState.profile} />
      ) : route === "progress" ? (
        <ProgressPage user={shellUser} profile={authState.profile} />
      ) : route === "feedback" ? (
        <FeedbackPage data={mockFeedbackData} user={shellUser} profile={authState.profile} />
      ) : route === "messages" ? (
        <StudentMessagesPage user={shellUser} profile={authState.profile} />
      ) : route === "record" ? (
        <RecordPage data={mockRecordTaskData} user={shellUser} profile={authState.profile} />
      ) : route === "teacher-assign" ? (
        <TeacherAssignPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-daily-planner" ? (
        <DailyTaskPlannerPage user={shellUser} profile={authState.profile} />
      ) : route === "daily-reminders" ? (
        <DailyRemindersPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-smart-builder" ? (
        <SmartTaskBuilderPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-messages" ? (
        <TeacherMessagesPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-review" ? (
        <TeacherReviewPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-students" ? (
        <TeacherStudentsPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-tasks" ? (
        <TeacherTasksPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-weekly-focus" ? (
        <TeacherWeeklyFocusPage user={shellUser} profile={authState.profile} />
      ) : route === "teacher-library" ? (
        <AdminLibraryPage user={shellUser} profile={authState.profile} managerRole="teacher" />
      ) : route === "admin-library" ? (
        <AdminLibraryPage user={shellUser} profile={authState.profile} managerRole="admin" />
      ) : route === "admin-daily-planner" ? (
        <DailyTaskPlannerPage user={shellUser} profile={authState.profile} />
      ) : route === "admin-smart-builder" ? (
        <SmartTaskBuilderPage user={shellUser} profile={authState.profile} />
      ) : route === "admin-mascots-preview" ? (
        <MascotPreviewPage user={shellUser} profile={authState.profile} />
      ) : route === "admin-users" ? (
        <AdminUsersPage user={shellUser} profile={authState.profile} mode="users" />
      ) : route === "admin-add-users" ? (
        <AdminUsersPage user={shellUser} profile={authState.profile} mode="add" />
      ) : route === "admin-relationships" ? (
        <AdminTeacherLinksPage user={shellUser} profile={authState.profile} />
      ) : route === "practice" ? (
        <PracticePage data={mockPracticeData} user={shellUser} profile={authState.profile} />
      ) : (
        <StudentHomePage
          data={{
            ...mockStudentHomeData,
            user: shellUser
          }}
          profile={authState.profile}
        />
      )}
    </AppShell>
  );
}
