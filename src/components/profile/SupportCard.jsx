import { HelpCircleIcon } from "../icons.jsx";

export function SupportCard({ support }) {
  return (
    <section className="card profile-support-card" aria-labelledby="support-title">
      <div className="profile-card-icon" aria-hidden="true">
        <HelpCircleIcon />
      </div>
      <div>
        <h2 id="support-title">{support.title}</h2>
        <p>{support.message}</p>
        <button className="secondary-button" type="button" disabled>
          {support.cta}
        </button>
        <p className="profile-note">{support.note}</p>
      </div>
    </section>
  );
}
