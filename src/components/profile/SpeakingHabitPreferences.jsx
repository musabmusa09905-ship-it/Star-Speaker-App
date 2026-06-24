import { ClockIcon } from "../icons.jsx";

export function SpeakingHabitPreferences({ preferences }) {
  return (
    <section className="card profile-preferences-card" aria-labelledby="habit-preferences-title">
      <div className="profile-section-heading">
        <div className="profile-card-icon" aria-hidden="true">
          <ClockIcon />
        </div>
        <div>
          <p className="card-eyebrow card-eyebrow--red">Settings preview</p>
          <h2 id="habit-preferences-title">{preferences.title}</h2>
        </div>
      </div>

      <div className="preference-list">
        {preferences.items.map((item) => (
          <div className="preference-row" key={item}>
            <span>{item}</span>
            <button type="button" disabled>
              Not connected
            </button>
          </div>
        ))}
      </div>

      <p className="profile-note">{preferences.note}</p>
    </section>
  );
}
