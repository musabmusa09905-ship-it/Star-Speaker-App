import { BellIcon } from "./icons.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function Header({ user, title, subtitle, children }) {
  const hasName = Boolean(user.name);
  const notificationCount = user.notifications || 0;
  const heading = title || (hasName ? `Welcome back, ${user.name}` : user.greeting);
  const note = subtitle || user.note;

  return (
    <header className="home-header">
      <div className="home-header__brand">
        <BrandLogo compact />
      </div>

      <div className="home-header__copy">
        <h1>{heading}</h1>
        {note && <p className="home-header__note">{note}</p>}
        {children}
      </div>

      <div className="home-header__actions">
        <button
          className="icon-button notification-button"
          type="button"
          aria-label={
            notificationCount > 0
              ? `${notificationCount} unread notifications`
              : "No unread notifications"
          }
        >
          <BellIcon className="icon-button__icon" />
          {notificationCount > 0 && (
            <span className="notification-badge">{notificationCount}</span>
          )}
        </button>
        <button className="avatar-button" type="button" aria-label="Open profile">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            initials={user.initials}
            name={user.name || user.email}
            decorative
          />
        </button>
      </div>
    </header>
  );
}
