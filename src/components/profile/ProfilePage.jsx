import { useEffect, useState } from "react";
import { Header } from "../Header.jsx";
import { LearningGoalCard } from "./LearningGoalCard.jsx";
import { StudentProfileSummary } from "./StudentProfileSummary.jsx";
import { BellIcon, ClockIcon, TargetIcon } from "../icons.jsx";
import { getStudentLearningOverview } from "../../lib/studentLearningProfile.js";
import { useTheme } from "../../lib/theme.js";
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationPermission,
  getPushNotificationSnapshot
} from "../../lib/pushNotifications.js";

function getProfileSummary(profile, fallbackSummary) {
  if (!profile) {
    return fallbackSummary;
  }

  return {
    title: "Account profile",
    displayName: profile.full_name || "Name not set",
    status: `${profile.role} account`,
    message:
      profile.role === "teacher"
        ? "Your teaching identity and account controls."
        : profile.role === "student"
          ? "Your learning identity and account controls."
          : "Your account identity and controls."
  };
}

function WeeklyFocusProfileCard({ weeklyFocus, isLoading, error }) {
  const hasFocus = Boolean(weeklyFocus);

  if (!hasFocus && !isLoading && !error) {
    return null;
  }

  return (
    <section className="card profile-card profile-weekly-focus-card" aria-labelledby="profile-weekly-focus-title">
      <div className="profile-card-icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher weekly focus</p>
        <h2 id="profile-weekly-focus-title">
          {isLoading
            ? "Loading weekly focus..."
            : hasFocus
              ? weeklyFocus.focusTitle || "Weekly focus"
              : "Your teacher has not set a weekly focus yet."}
        </h2>
        <p>
          {error ||
            (hasFocus
              ? weeklyFocus.focusNote || "Your teacher has not added a focus note yet."
              : "Your weekly speaking focus will appear here after your teacher sets it.")}
        </p>
        {hasFocus && (
          <p className="profile-weekly-focus-target">
            Target: {weeklyFocus.targetDescription || "No target description added yet."}
          </p>
        )}
        {hasFocus && weeklyFocus.weekStart && (
          <p className="profile-weekly-focus-date">Week of {formatDate(weeklyFocus.weekStart)}</p>
        )}
      </div>
    </section>
  );
}

function formatMinutes(value) {
  if (!value) {
    return null;
  }

  return `${value} min`;
}

function PracticeCommitmentCard({ learningProfile, isLoading, error }) {
  const commitmentRows = [
    {
      label: "Practice target",
      value: learningProfile?.practiceTarget || null
    }
  ];
  const hasCommitment = commitmentRows.some((row) => row.value);

  if (!hasCommitment && !isLoading && !error) {
    return null;
  }

  return (
    <section className="card profile-card profile-practice-commitment-card" aria-labelledby="practice-commitment-title">
      <div className="profile-card-icon" aria-hidden="true">
        <ClockIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Practice commitment</p>
        <h2 id="practice-commitment-title">Practice commitment</h2>
        <p>
          {error ||
            (isLoading
              ? "Loading your practice commitment..."
              : hasCommitment
                ? "These targets help you show up consistently."
                : "Your practice commitment will appear after your teacher sets it.")}
        </p>
        {hasCommitment && <p className="profile-note">Consistency matters more than perfection.</p>}
        <div className="profile-field-list">
          {commitmentRows.map((row) => (
            <div className="profile-field-row" key={row.label}>
              <span>{row.label}</span>
              <b className={row.value ? "is-set" : ""}>{row.value || "Pending"}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ];

  return (
    <section className="card profile-card profile-appearance-card" aria-labelledby="profile-appearance-title">
      <div className="profile-card-icon" aria-hidden="true">
        <TargetIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Appearance</p>
        <h2 id="profile-appearance-title">Appearance</h2>
        <p>Choose how Heart of English looks on this device.</p>
        <div className="profile-theme-toggle" role="group" aria-label="Choose app appearance">
          {options.map((option) => (
            <button
              type="button"
              className={theme === option.value ? "is-active" : ""}
              aria-pressed={theme === option.value}
              onClick={() => setTheme(option.value)}
              key={option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function getPushRoleCopy(role) {
  if (role === "teacher") {
    return "Get alerts when students submit tasks or reviews are waiting.";
  }

  if (["admin", "coordinator"].includes(role)) {
    return "Get alerts for important school activity and pending actions.";
  }

  return "Get reminders for your daily English task, new feedback, and messages.";
}

function PushNotificationsCard({ profile }) {
  const [state, setState] = useState({
    isLoading: true,
    isWorking: false,
    supported: true,
    permission: "default",
    subscribed: false,
    message: "",
    error: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPushStatus() {
      if (!profile?.id) {
        setState((current) => ({
          ...current,
          isLoading: false,
          supported: false,
          error: "You must be signed in to manage notifications."
        }));
        return;
      }

      const snapshot = await getPushNotificationSnapshot(profile.id);

      if (!isMounted) {
        return;
      }

      setState({
        isLoading: false,
        isWorking: false,
        supported: snapshot.supported,
        permission: snapshot.permission,
        subscribed: snapshot.subscribed,
        message: snapshot.subscribed ? "Notifications enabled" : "",
        error: snapshot.error || ""
      });
    }

    loadPushStatus();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  async function handleEnable() {
    setState((current) => ({
      ...current,
      isWorking: true,
      message: "Preparing notification permission...",
      error: ""
    }));

    const result = await enablePushNotifications({
      userId: profile.id,
      role: profile.role
    });

    if (result.error) {
      setState((current) => ({
        ...current,
        isWorking: false,
        permission: getNotificationPermission(),
        subscribed: false,
        message: "",
        error: result.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      isWorking: false,
      permission: "granted",
      subscribed: true,
      message: "Notifications enabled",
      error: ""
    }));
  }

  async function handleDisable() {
    setState((current) => ({
      ...current,
      isWorking: true,
      message: "Disabling notifications on this browser...",
      error: ""
    }));

    const result = await disablePushNotifications({
      userId: profile.id
    });

    if (result.error) {
      setState((current) => ({
        ...current,
        isWorking: false,
        error: result.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      isWorking: false,
      permission: getNotificationPermission(),
      subscribed: false,
      message: "Notifications disabled on this browser.",
      error: ""
    }));
  }

  const isDenied = state.permission === "denied";
  const canEnable = state.supported && !state.subscribed && !isDenied;

  return (
    <section className="card profile-card profile-push-card" aria-labelledby="profile-push-title">
      <div className="profile-card-icon" aria-hidden="true">
        <BellIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Push Notifications</p>
        <h2 id="profile-push-title">Push Notifications</h2>
        <p>Allow Heart of English to remind you when something needs your attention.</p>
        <p className="profile-push-role-copy">{getPushRoleCopy(profile?.role)}</p>

        <div className="profile-push-actions">
          {state.isLoading && (
            <p className="profile-push-status profile-push-status--info">Checking notification support...</p>
          )}

          {!state.isLoading && !state.supported && (
            <p className="profile-push-status profile-push-status--error">
              Push notifications are not supported on this browser/device.
            </p>
          )}

          {!state.isLoading && isDenied && (
            <p className="profile-push-status profile-push-status--error">
              Notifications are blocked in your browser settings. Please allow notifications for this site to use this feature.
            </p>
          )}

          {!state.isLoading && state.subscribed && (
            <p className="profile-push-status profile-push-status--success">Notifications enabled</p>
          )}

          {canEnable && (
            <button className="primary-button" type="button" onClick={handleEnable} disabled={state.isWorking}>
              {state.isWorking ? "Enabling..." : "Enable notifications"}
            </button>
          )}

          {!state.isLoading && state.supported && state.subscribed && (
            <button className="profile-push-secondary-button" type="button" onClick={handleDisable} disabled={state.isWorking}>
              {state.isWorking ? "Disabling..." : "Disable notifications"}
            </button>
          )}

          {state.message && !state.subscribed && (
            <p className="profile-push-status profile-push-status--info">{state.message}</p>
          )}

          {state.error && (
            <p className="profile-push-status profile-push-status--error">{state.error}</p>
          )}
        </div>

        {state.subscribed && (
          <p className="profile-push-device">This browser is registered for private app notifications.</p>
        )}
      </div>
    </section>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function buildLearningGoalData(baseGoal, learningProfile) {
  const mainGoal = learningProfile?.mainGoal || "";

  return {
    ...baseGoal,
    value: mainGoal,
    message: mainGoal
      ? "Your goal keeps your practice focused."
      : baseGoal.message
  };
}

export function ProfilePage({
  data,
  user,
  profile,
  onLogout,
  onProfileUpdated,
  isSigningOut = false
}) {
  const isStudent = profile?.role === "student";
  const [learningState, setLearningState] = useState({
    isLoading: isStudent,
    error: "",
    learningProfile: null,
    weeklyFocus: null
  });
  const summary = getProfileSummary(profile, data.summary);

  useEffect(() => {
    let isMounted = true;

    async function loadLearningOverview() {
      if (profile?.role !== "student") {
        setLearningState({
          isLoading: false,
          error: "",
          learningProfile: null,
          weeklyFocus: null
        });
        return;
      }

      setLearningState({
        isLoading: true,
        error: "",
        learningProfile: null,
        weeklyFocus: null
      });

      const result = await getStudentLearningOverview(profile.id);

      if (!isMounted) {
        return;
      }

      setLearningState({
        isLoading: false,
        error: result.error || "",
        learningProfile: result.profile,
        weeklyFocus: result.weeklyFocus
      });
    }

    loadLearningOverview();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  const learningGoal = buildLearningGoalData(data.learningGoal, learningState.learningProfile);

  return (
    <div className="profile-page">
      <Header user={user} title={data.header.title} subtitle="Your account identity and profile controls." />

      <div className="profile-grid">
        <StudentProfileSummary
          summary={summary}
          initials={user.initials}
          onProfileUpdated={onProfileUpdated}
          profile={profile}
          onLogout={onLogout}
          isSigningOut={isSigningOut}
        />
        {isStudent && (
          <>
            {learningGoal.value && <LearningGoalCard goal={learningGoal} />}
            <WeeklyFocusProfileCard
              weeklyFocus={learningState.weeklyFocus}
              isLoading={learningState.isLoading}
              error={learningState.error}
            />
            <PracticeCommitmentCard
              learningProfile={learningState.learningProfile}
              isLoading={learningState.isLoading}
              error={learningState.error}
            />
          </>
        )}
        <PushNotificationsCard profile={profile} />
        <AppearanceCard />
      </div>
    </div>
  );
}
