import { LevelIcon } from "../icons.jsx";

export function LevelFocusCard({ levelFocus }) {
  const rows =
    levelFocus.fields ||
    levelFocus.futureFields.map((field) => ({
      label: field,
      value: null
    }));

  return (
    <section className="card profile-card level-focus-card" aria-labelledby="level-focus-title">
      <div className="profile-card-icon" aria-hidden="true">
        <LevelIcon />
      </div>
      <div>
        <h2 id="level-focus-title">{levelFocus.title}</h2>
        <p>{levelFocus.message}</p>
        <div className="profile-field-list">
          {rows.map((field) => (
            <div className="profile-field-row" key={field.label}>
              <span>{field.label}</span>
              <b className={field.value ? "is-set" : ""}>{field.value || "Pending"}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
