import { BrandLogo } from "./BrandLogo.jsx";
import { IconByName } from "./icons.jsx";
import { NavBadge } from "./NavBadge.jsx";
import { UserAvatar } from "./UserAvatar.jsx";
import { useTheme } from "../lib/theme.js";
import { getAppIconAsset, replaceWithFallbackImage } from "../lib/themeAssets.js";

export function DesktopSidebar({ activeTab, isCollapsed = false, navItems, user, onToggleCollapsed }) {
  const { isDark } = useTheme();
  const appIconAsset = getAppIconAsset(isDark);
  const displayName = user.name || "User";
  const collapseLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside className="sidebar desktop-sidebar" aria-label="App navigation">
      <div className="sidebar__top">
        <div className="sidebar-brand-row">
          <div className="sidebar-brand-shell">
            <BrandLogo />
            <img
              className="sidebar-brand-mark"
              src={appIconAsset.src}
              data-fallback-src={appIconAsset.fallbackSrc}
              alt=""
              aria-hidden="true"
              onError={replaceWithFallbackImage}
            />
          </div>
          <button
            className="sidebar-collapse-button"
            type="button"
            aria-label={collapseLabel}
            aria-pressed={isCollapsed}
            title={collapseLabel}
            onClick={onToggleCollapsed}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = item.label === activeTab;
            return (
              <a
                key={item.label}
                className={`sidebar-nav__item ${isActive ? "is-active" : ""} ${
                  item.primary ? "is-primary-action" : ""
                }`}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                data-tooltip={item.label}
              >
                <IconByName className="nav-icon" name={item.icon} />
                <span className="sidebar-nav__label">{item.label}</span>
                <NavBadge
                  count={item.badge}
                  label={item.badgeLabel || "pending items"}
                  className="nav-unread-badge"
                />
              </a>
            );
          })}
        </nav>
      </div>

      <div
        className="sidebar-profile"
        aria-label={`Signed in account: ${displayName}, ${user.role}`}
        data-tooltip={`${displayName} - ${user.role}`}
      >
        <UserAvatar
          avatarUrl={user.avatarUrl}
          initials={user.initials}
          name={displayName}
          decorative
        />
        <div className="sidebar-profile__copy">
          <p className="sidebar-profile__name">{displayName}</p>
          <p className="sidebar-profile__role">{user.role}</p>
        </div>
      </div>
    </aside>
  );
}
