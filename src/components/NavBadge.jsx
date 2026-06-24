export function formatBadgeCount(count) {
  const numericCount = Number(count) || 0;

  if (numericCount > 99) {
    return "99+";
  }

  return String(numericCount);
}

export function NavBadge({ count, label = "pending items", className = "" }) {
  const numericCount = Number(count) || 0;

  if (numericCount <= 0) {
    return null;
  }

  return (
    <b className={`nav-badge ${className}`.trim()} aria-label={`${formatBadgeCount(numericCount)} ${label}`}>
      {formatBadgeCount(numericCount)}
    </b>
  );
}
