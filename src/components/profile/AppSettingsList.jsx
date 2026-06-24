import { ChevronRightIcon, SettingsIcon } from "../icons.jsx";

export function AppSettingsList({ settings }) {
  return (
    <section className="card profile-settings-card" aria-labelledby="app-settings-title">
      <div className="profile-section-heading">
        <div className="profile-card-icon" aria-hidden="true">
          <SettingsIcon />
        </div>
        <div>
          <p className="card-eyebrow card-eyebrow--red">App controls</p>
          <h2 id="app-settings-title">{settings.title}</h2>
        </div>
      </div>

      <div className="settings-row-list">
        {settings.items.map((item) => (
          <button type="button" className="settings-row" disabled key={item}>
            <span>{item}</span>
            <small>Managed by school</small>
            <ChevronRightIcon />
          </button>
        ))}
      </div>
    </section>
  );
}
