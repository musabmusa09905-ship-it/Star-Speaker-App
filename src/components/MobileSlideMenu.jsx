import { IconByName } from "./icons.jsx";
import { UserAvatar } from "./UserAvatar.jsx";
import { useTheme } from "../lib/theme.js";
import { getLogoAsset, replaceWithFallbackImage } from "../lib/themeAssets.js";

export function MobileSlideMenu({ activeTab, isOpen, navItems, user, onClose }) {
  const { isDark } = useTheme();
  const logoAsset = getLogoAsset(isDark);
  const displayName = user.name || "User";

  return (
    <>
      <button
        className={`mobile-menu-overlay ${isOpen ? "is-open" : ""}`}
        type="button"
        aria-label="Close navigation menu"
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside className={`mobile-slide-menu ${isOpen ? "is-open" : ""}`} aria-label="Full mobile navigation" aria-hidden={!isOpen}>
        <div className="mobile-slide-menu__top">
          <div className="mobile-drawer-logo-panel">
            <a className="mobile-drawer-logo" href="/" aria-label="Heart of English home" onClick={onClose}>
              <img
                className="mobile-drawer-logo__image"
                src={logoAsset.src}
                data-fallback-src={logoAsset.fallbackSrc}
                alt="Heart of English"
                decoding="async"
                onError={replaceWithFallbackImage}
              />
            </a>
          </div>
          <button className="mobile-slide-menu__close" type="button" aria-label="Close navigation menu" onClick={onClose}>
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>

        <nav className="mobile-slide-menu__nav" aria-label="Full navigation">
          {navItems.map((item) => {
            const isActive = item.label === activeTab;
            return (
              <a
                key={item.label}
                className={`mobile-slide-menu__item ${isActive ? "is-active" : ""} ${
                  item.primary ? "is-primary-action" : ""
                }`}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
              >
                <IconByName className="nav-icon" name={item.icon} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <b className="nav-unread-badge" aria-label={`${item.badge} unread messages`}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </b>
                )}
              </a>
            );
          })}
        </nav>

        <div className="mobile-slide-menu__profile" aria-label="Signed in account">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            initials={user.initials}
            name={displayName}
            decorative
          />
          <div>
            <p className="sidebar-profile__name">{displayName}</p>
            <p className="sidebar-profile__role">{user.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
