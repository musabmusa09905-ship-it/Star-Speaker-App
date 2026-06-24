import { useEffect, useMemo, useState } from "react";
import { Header } from "../Header.jsx";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { FlameIcon, ProgressIcon, StarIcon, TargetIcon } from "../icons.jsx";
import { getConsistencyBoard } from "../../lib/consistencyBoard.js";

const tabs = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" }
];

function BoardState({ title, message }) {
  const isLoading = title.toLowerCase().includes("loading");

  return (
    <section
      className={`card consistency-state-card ${isLoading ? "branded-loading-state" : ""}`}
      aria-labelledby="consistency-state-title"
    >
      <div className="consistency-state-card__icon" aria-hidden="true">
        {isLoading ? <img src="/app-icon.png" alt="" decoding="async" /> : <ProgressIcon />}
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Consistency Board</p>
        <h2 id="consistency-state-title">{title}</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function BoardTabs({ activePeriod, onChange }) {
  return (
    <div className="consistency-tabs" role="tablist" aria-label="Consistency Board periods">
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          aria-selected={activePeriod === tab.key}
          className={activePeriod === tab.key ? "is-active" : ""}
          onClick={() => onChange(tab.key)}
          key={tab.key}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function BoardHero({ rows, activePeriod, profile }) {
  const meaningfulRows = rows.filter(
    (row) =>
      row.submittedTaskCount > 0 ||
      row.activeDays > 0 ||
      getPointsForPeriod(row, activePeriod) > 0
  );
  const activeStudents = meaningfulRows.length;
  const totalSubmissions = meaningfulRows.reduce((sum, row) => sum + row.submittedTaskCount, 0);
  const topPoints = Math.max(0, ...meaningfulRows.map((row) => getPointsForPeriod(row, activePeriod)));
  const roleCopy =
    profile?.role === "admin"
      ? "Full school view"
      : profile?.role === "teacher"
        ? "School Top 10 plus your assigned students"
        : "Top 10 plus your private position";

  return (
    <section className="card consistency-hero-card mascot-card mascot-card--compact" aria-labelledby="consistency-hero-title">
      <div className="mascot-card-content">
        <p className="card-eyebrow card-eyebrow--red">Consistency Board</p>
        <h2 id="consistency-hero-title">Rankings are based on consistency, not English level.</h2>
        <p>
          Completed speaking practice, active days, reflections, and streak effort shape this board.
          Feedback text, teacher scores, emails, levels, and private notes stay hidden.
        </p>
        <div className="consistency-hero-card__stats" aria-label="Consistency board summary">
          <span>{activeStudents} active {activeStudents === 1 ? "student" : "students"}</span>
          <span>{totalSubmissions} submitted tasks</span>
          <span>{topPoints} leading points</span>
          <span>{roleCopy}</span>
        </div>
      </div>
      <div className="mascot-card-visual">
        <MascotAnimation
          type="progress"
          size="small"
          motion="progress"
          label="Progress mascot for consistency board"
        />
      </div>
    </section>
  );
}

function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function getPointsForPeriod(row, period) {
  if (period === "week") {
    return row.weeklyPoints;
  }

  if (period === "month") {
    return row.monthlyPoints;
  }

  return row.yearlyPoints;
}

function hasMeaningfulConsistency(rows, activePeriod) {
  return rows.some(
    (row) =>
      row.submittedTaskCount > 0 ||
      row.activeDays > 0 ||
      getPointsForPeriod(row, activePeriod) > 0
  );
}

function BoardEmptyCard({ eyebrow = "Consistency Board", title, message }) {
  return (
    <section className="card consistency-board-card">
      <p className="card-eyebrow card-eyebrow--red">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

function RankingRows({ rows, activePeriod }) {
  return (
    <div className="consistency-list">
      {rows.map((row, index) => (
        <article
          className={[
            "consistency-row",
            row.rank <= 3 ? "consistency-row--top" : "",
            row.isCurrentUser ? "is-current" : ""
          ].filter(Boolean).join(" ")}
          key={`${row.period}-${row.rank}-${row.displayName}-${index}`}
        >
          <div className="consistency-row__rank">#{row.rank}</div>
          <div className="consistency-row__main">
            <h3>{row.displayName}</h3>
            <p>
              {row.activeDays} active {row.activeDays === 1 ? "day" : "days"} - {row.submittedTaskCount} submitted
            </p>
          </div>
        <div className="consistency-row__score">
          <strong>{getPointsForPeriod(row, activePeriod)}</strong>
          <span>points</span>
          </div>
          <div className="consistency-row__meta">
            <span>{formatPercent(row.completionRate)} completion</span>
            <span>{row.currentStreak} day streak</span>
            {row.badges.length > 0 && (
              <span>
                {row.badges.length} {row.badges.length === 1 ? "badge" : "badges"} - {row.badges[row.badges.length - 1]}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function TopTenBoard({ rows, activePeriod }) {
  const topRows = rows.filter((row) => row.rank <= 10);

  if (!topRows.length || !hasMeaningfulConsistency(topRows, activePeriod)) {
    return (
      <BoardEmptyCard
        eyebrow="Top 10"
        title="No consistency data yet."
        message="Student practice will appear here after submissions."
      />
    );
  }

  return (
    <section className="card consistency-board-card" aria-labelledby="consistency-top-title">
      <div className="consistency-board-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Top 10</p>
          <h2 id="consistency-top-title">Habit Effort Ranking</h2>
        </div>
        <span>Consistency only</span>
      </div>

      <RankingRows rows={topRows} activePeriod={activePeriod} />
    </section>
  );
}

function OwnPositionCard({ rows, activePeriod }) {
  const ownRow = rows.find((row) => row.isCurrentUser);

  if (!ownRow) {
    return (
      <section className="card consistency-own-card" aria-labelledby="consistency-privacy-title">
        <div className="consistency-own-card__icon" aria-hidden="true">
          <TargetIcon />
        </div>
        <div>
          <p className="card-eyebrow card-eyebrow--red">Privacy-first</p>
          <h2 id="consistency-privacy-title">This board ranks habit effort only.</h2>
          <p>Teacher feedback, scores, emails, levels, and private notes are not shown here.</p>
        </div>
      </section>
    );
  }

  const topTen = rows.filter((row) => row.rank <= 10);
  const tenthRow = topTen[topTen.length - 1] || null;
  const pointsNeeded =
    ownRow.rank <= 10 || !tenthRow
      ? 0
      : Math.max(0, getPointsForPeriod(tenthRow, activePeriod) - getPointsForPeriod(ownRow, activePeriod) + 1);

  return (
    <section className="card consistency-own-card" aria-labelledby="consistency-own-title">
      <div className="consistency-own-card__icon" aria-hidden="true">
        <FlameIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Your position</p>
        <h2 id="consistency-own-title">#{ownRow.rank}</h2>
        <p>
          {ownRow.rank <= 10
            ? "You are currently in the Top 10."
            : `You need ${pointsNeeded} more ${pointsNeeded === 1 ? "point" : "points"} to enter the Top 10.`}
        </p>
      </div>
      <div className="consistency-own-card__stats">
        <span>{getPointsForPeriod(ownRow, activePeriod)} points</span>
        <span>{ownRow.activeDays} active days</span>
        <span>{ownRow.submittedTaskCount} submitted</span>
        <span>{formatPercent(ownRow.completionRate)} completion</span>
        <span>{ownRow.currentStreak} day streak</span>
      </div>
    </section>
  );
}

function AdminFullBoard({ rows, activePeriod, searchTerm, onSearchChange }) {
  const trimmedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = trimmedSearch
    ? rows.filter((row) => row.displayName.toLowerCase().includes(trimmedSearch))
    : rows;

  return (
    <section className="card consistency-board-card consistency-admin-card" aria-labelledby="consistency-admin-title">
      <div className="consistency-board-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Admin view</p>
          <h2 id="consistency-admin-title">Full School Ranking</h2>
        </div>
        <span>Safe effort metrics only</span>
      </div>

      <label className="consistency-search">
        <span>Search student name</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by display name..."
        />
      </label>

      {!hasMeaningfulConsistency(rows, activePeriod) ? (
        <div className="consistency-inline-empty">
          <h3>No consistency data yet.</h3>
          <p>Student practice will appear here after submissions.</p>
        </div>
      ) : !filteredRows.length ? (
        <div className="consistency-inline-empty">
          <h3>No students match that search.</h3>
          <p>Try another display name.</p>
        </div>
      ) : (
        <RankingRows rows={filteredRows} activePeriod={activePeriod} />
      )}
    </section>
  );
}

function TeacherAssignedBoard({ rows, activePeriod }) {
  const assignedRows = rows.filter((row) => row.isAssignedStudent);

  if (!assignedRows.length) {
    return (
      <BoardEmptyCard
        eyebrow="Teacher view"
        title="Your assigned students"
        message="Assigned student consistency will appear here after students are linked to you."
      />
    );
  }

  return (
    <section className="card consistency-board-card" aria-labelledby="consistency-assigned-title">
      <div className="consistency-board-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Teacher view</p>
          <h2 id="consistency-assigned-title">Your assigned students</h2>
        </div>
        <span>Private to your roster</span>
      </div>

      <RankingRows rows={assignedRows} activePeriod={activePeriod} />
    </section>
  );
}

function BoardMethodCard() {
  return (
    <section className="card consistency-method-card" aria-labelledby="consistency-method-title">
      <p className="card-eyebrow card-eyebrow--red">How points work</p>
      <h2 id="consistency-method-title">Effort, not English performance</h2>
      <p>Rankings are based on consistency and completed practice, not English level. Feedback text, correction notes, emails, levels, and teacher score details are not part of the board.</p>
      <div className="consistency-method-grid">
        <div>
          <StarIcon />
          <span>10 points</span>
          <p>Submit one speaking task.</p>
        </div>
        <div>
          <TargetIcon />
          <span>3 points</span>
          <p>Add a reflection.</p>
        </div>
        <div>
          <ProgressIcon />
          <span>5 points</span>
          <p>Submit before the due date.</p>
        </div>
        <div>
          <FlameIcon />
          <span>Streak bonus</span>
          <p>3, 5, and 7 day streaks earn extra points.</p>
        </div>
      </div>
    </section>
  );
}

export function ConsistencyBoardPage({ user, profile }) {
  const [activePeriod, setActivePeriod] = useState("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [state, setState] = useState({
    isLoading: true,
    error: "",
    rows: []
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBoard() {
      setState({
        isLoading: true,
        error: "",
        rows: []
      });

      const result = await getConsistencyBoard();

      if (!isMounted) {
        return;
      }

      setState({
        isLoading: false,
        error: result.error || "",
        rows: result.rows
      });
    }

    loadBoard();

    return () => {
      isMounted = false;
    };
  }, []);

  const periodRows = useMemo(
    () => state.rows.filter((row) => row.period === activePeriod),
    [activePeriod, state.rows]
  );
  const isAdmin = profile?.role === "admin";
  const isTeacher = profile?.role === "teacher";
  const isStudent = profile?.role === "student";

  return (
    <div className="consistency-page">
      <Header
        user={user}
        title="Consistency Board"
        subtitle="A school-wide habit board for speaking effort."
      />

      {state.isLoading ? (
        <BoardState title="Loading consistency data..." message="Please wait while we calculate habit effort." />
      ) : state.error ? (
        <BoardState title="Could not load the board." message={state.error} />
      ) : (
        <div className="consistency-grid">
          <BoardHero rows={periodRows} activePeriod={activePeriod} profile={profile} />
          <BoardTabs activePeriod={activePeriod} onChange={setActivePeriod} />
          {isAdmin ? (
            <AdminFullBoard
              rows={periodRows}
              activePeriod={activePeriod}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          ) : (
            <>
              {isStudent && <OwnPositionCard rows={periodRows} activePeriod={activePeriod} />}
              <TopTenBoard rows={periodRows} activePeriod={activePeriod} />
              {isTeacher && <TeacherAssignedBoard rows={periodRows} activePeriod={activePeriod} />}
            </>
          )}
          <BoardMethodCard />
        </div>
      )}
    </div>
  );
}
