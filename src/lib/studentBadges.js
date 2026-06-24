import { calculateStudentStreak, getLocalDateKey } from "./studentStreaks.js";

function toDateFromKey(key) {
  const [year, month, day] = String(key || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function getSubmissionDayCounts(submissions) {
  return (submissions || []).reduce((counts, submission) => {
    if (!submission.submitted_at) {
      return counts;
    }

    const key = getLocalDateKey(submission.submitted_at);
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
}

function getCurrentMonthActivity(submissions, baseDate = new Date()) {
  const date = new Date(baseDate);
  const elapsedDays = Math.max(1, date.getDate());
  const dayCounts = getSubmissionDayCounts(submissions);
  let activeDays = 0;

  for (let day = 1; day <= elapsedDays; day += 1) {
    const current = new Date(date.getFullYear(), date.getMonth(), day);
    if (dayCounts.has(getLocalDateKey(current))) {
      activeDays += 1;
    }
  }

  return {
    activeDays,
    elapsedDays,
    completionRate: Math.round((activeDays / elapsedDays) * 100)
  };
}

function hasComeback(submissions) {
  const dayKeys = [...getSubmissionDayCounts(submissions).keys()].sort();

  return dayKeys.some((key, index) => {
    if (index === 0) {
      return false;
    }

    const previous = toDateFromKey(dayKeys[index - 1]);
    const current = toDateFromKey(key);
    const gapDays = Math.round((current.getTime() - previous.getTime()) / 86400000);
    return gapDays >= 7;
  });
}

function clampProgress(current, goal) {
  if (!goal) {
    return 0;
  }

  return Math.min(100, Math.round((Math.max(0, current) / goal) * 100));
}

export function calculateStudentBadges(submissions, baseDate = new Date()) {
  const safeSubmissions = submissions || [];
  const streak = calculateStudentStreak(safeSubmissions, baseDate);
  const month = getCurrentMonthActivity(safeSubmissions, baseDate);
  const bestStreak = Math.max(streak.currentStreak, streak.bestStreak);
  const totalSubmissions = safeSubmissions.length;

  return [
    {
      key: "first-step",
      label: "First Step",
      description: "You submitted your first speaking or writing task.",
      requirement: "Submit your first speaking or writing task.",
      earned: totalSubmissions >= 1,
      current: Math.min(totalSubmissions, 1),
      goal: 1,
      progress: clampProgress(totalSubmissions, 1)
    },
    {
      key: "three-day-streak",
      label: "3-Day Streak",
      description: "You built a 3-day output streak.",
      requirement: "Submit for 3 days in a row.",
      earned: bestStreak >= 3,
      current: Math.min(bestStreak, 3),
      goal: 3,
      progress: clampProgress(bestStreak, 3)
    },
    {
      key: "seven-day-speaker",
      label: "7-Day Speaker",
      description: "You built a 7-day output streak.",
      requirement: "Build a 7-day speaking or writing streak.",
      earned: bestStreak >= 7,
      current: Math.min(bestStreak, 7),
      goal: 7,
      progress: clampProgress(bestStreak, 7)
    },
    {
      key: "monthly-grinder",
      label: "Monthly Grinder",
      description: "You completed 20 practice days this month.",
      requirement: "Complete 20 practice days this month.",
      earned: month.activeDays >= 20,
      current: Math.min(month.activeDays, 20),
      goal: 20,
      progress: clampProgress(month.activeDays, 20)
    },
    {
      key: "consistency-elite",
      label: "Consistency Elite",
      description: "You reached 80% monthly completion.",
      requirement: "Reach 80% monthly completion.",
      earned: month.completionRate >= 80,
      current: Math.min(month.completionRate, 80),
      goal: 80,
      progress: clampProgress(month.completionRate, 80),
      unit: "%"
    },
    {
      key: "iron-voice",
      label: "Iron Voice",
      description: "You submitted 100 speaking or writing tasks.",
      requirement: "Submit 100 speaking or writing tasks.",
      earned: totalSubmissions >= 100,
      current: Math.min(totalSubmissions, 100),
      goal: 100,
      progress: clampProgress(totalSubmissions, 100)
    },
    {
      key: "comeback",
      label: "Comeback",
      description: "You returned after 7 or more inactive days.",
      requirement: "Submit again after 7 or more inactive days.",
      earned: hasComeback(safeSubmissions),
      current: hasComeback(safeSubmissions) ? 1 : 0,
      goal: 1,
      progress: hasComeback(safeSubmissions) ? 100 : 0
    }
  ];
}

export function getEarnedBadges(badges) {
  return (badges || []).filter((badge) => badge.earned);
}

export function getLockedBadges(badges) {
  return (badges || []).filter((badge) => !badge.earned);
}

export function getLatestEarnedBadge(badges) {
  const earned = getEarnedBadges(badges);
  return earned[earned.length - 1] || null;
}

export function getNextRecommendedBadge(badges) {
  const locked = getLockedBadges(badges);

  if (!locked.length) {
    return null;
  }

  return [...locked].sort((a, b) => b.progress - a.progress)[0];
}

export function getBadgeSummary(submissions) {
  const badges = calculateStudentBadges(submissions);
  const earned = getEarnedBadges(badges);
  const latestEarned = getLatestEarnedBadge(badges);
  const nextBadge = getNextRecommendedBadge(badges);

  return {
    badges,
    earned,
    earnedCount: earned.length,
    latestEarned,
    nextBadge
  };
}
