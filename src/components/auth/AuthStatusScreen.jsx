import { BrandLogo } from "../BrandLogo.jsx";

export function AuthStatusScreen({
  title,
  message,
  detail,
  actionLabel,
  onAction,
  isLoading = false
}) {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card--status" aria-live="polite">
        <div className="auth-card__brand">
          <BrandLogo />
        </div>
        <div className="auth-card__intro">
          <p className="card-eyebrow card-eyebrow--red">
            {isLoading ? "Loading" : "Account access"}
          </p>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
        {detail && <div className="auth-message">{detail}</div>}
        {actionLabel && onAction && (
          <button className="secondary-button auth-status-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </section>
    </main>
  );
}
