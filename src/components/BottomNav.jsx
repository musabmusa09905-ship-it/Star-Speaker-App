import { IconByName } from "./icons.jsx";
import { NavBadge } from "./NavBadge.jsx";

const compactMobileLabels = {
  Messages: "Msgs",
  "Assign Task": "Assign",
  "Weekly Focus": "Focus",
  "Teacher Links": "Links",
  "Task History": "Tasks",
  "Consistency Board": "Board"
};

function getMobileLabel(item) {
  return item.mobileLabel || compactMobileLabels[item.label] || item.label;
}

export function BottomNav({ activeTab, navItems }) {
  const recordItem = navItems.find((item) => item.label === "Record");
  const profileItem = navItems.find((item) => item.label === "Profile");
  const roleNavItems = [
    ...navItems.filter((item) => item.label !== "Profile").slice(0, 4),
    profileItem
  ].filter(Boolean);
  const visibleItems = recordItem
    ? [
        ...navItems.filter((item) => ["Home", "Practice"].includes(item.label)),
        recordItem,
        ...navItems.filter((item) => ["Feedback", "Library"].includes(item.label))
      ].filter(Boolean)
    : roleNavItems;

  const orderedItems = visibleItems.map((item) =>
    item.label === "Record"
      ? {
          ...item,
          primary: true
        }
      : item
  );

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <div
        className="bottom-nav__grid"
        style={{ "--bottom-nav-count": String(orderedItems.length) }}
      >
        {orderedItems.map((item) => {
          const isActive = item.label === activeTab;
          const mobileLabel = getMobileLabel(item);
          return (
            <a
              key={item.label}
              className={`bottom-nav__item ${isActive ? "is-active" : ""} ${
                item.primary ? "bottom-nav__record" : ""
              }`}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.primary ? "Open Record page" : item.label}
              title={item.label}
            >
              <span className="bottom-nav__icon">
                <IconByName name={item.icon} />
                <NavBadge
                  count={item.badge}
                  label={item.badgeLabel || "pending items"}
                  className="bottom-nav__badge"
                />
              </span>
              <span className="bottom-nav__label">{mobileLabel}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
