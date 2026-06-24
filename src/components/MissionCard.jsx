import { ArrowRightIcon, FlagIcon, TargetIcon } from "./icons.jsx";

export function MissionCard({ mission }) {
  return (
    <section className="card mission-card" aria-labelledby="mission-title">
      <div className="mission-card__copy">
        <p className="card-eyebrow card-eyebrow--red">
          <FlagIcon />
          {mission.eyebrow}
        </p>
        <h2 id="mission-title">{mission.title}</h2>
        <p>{mission.text}</p>
        <a className="text-button" href={mission.href}>
          {mission.cta}
          <ArrowRightIcon />
        </a>
      </div>
      <div className="mission-card__visual" aria-hidden="true">
        <TargetIcon />
      </div>
    </section>
  );
}
