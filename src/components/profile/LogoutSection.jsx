import { LogOutIcon } from "../icons.jsx";

export function LogoutSection({ logout, onLogout, isSigningOut = false }) {
  return (
    <section className="card profile-logout-card" aria-labelledby="logout-title">
      <div className="profile-card-icon" aria-hidden="true">
        <LogOutIcon />
      </div>
      <div>
        <h2 id="logout-title">{logout.title}</h2>
        <p>
          {onLogout
            ? "Sign out of this device when you finish practicing."
            : logout.message}
        </p>
        {onLogout && (
          <button
            className="secondary-button profile-logout-button"
            disabled={isSigningOut}
            type="button"
            onClick={onLogout}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        )}
      </div>
    </section>
  );
}
