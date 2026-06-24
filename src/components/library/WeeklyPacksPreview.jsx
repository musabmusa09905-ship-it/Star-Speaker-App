import { CalendarIcon } from "../icons.jsx";

export function WeeklyPacksPreview({ weeklyPacks }) {
  return (
    <section className="card library-small-card weekly-packs-card" aria-labelledby="weekly-packs-title">
      <div className="library-card-icon" aria-hidden="true">
        <CalendarIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Teacher-assigned</p>
        <h2 id="weekly-packs-title">{weeklyPacks.title}</h2>
        <p>{weeklyPacks.message}</p>
      </div>
    </section>
  );
}
