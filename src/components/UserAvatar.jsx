import { useEffect, useMemo, useState } from "react";

function getInitialsFromName(name) {
  const cleanName = name?.trim();

  if (!cleanName) {
    return "U";
  }

  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function UserAvatar({
  avatarUrl,
  className = "",
  decorative = true,
  initials,
  label,
  name,
  size = "medium"
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackInitials = useMemo(
    () => initials || getInitialsFromName(name),
    [initials, name]
  );
  const shouldShowImage = Boolean(avatarUrl) && !imageFailed;
  const avatarLabel = label || `${name || "User"} profile photo`;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  return (
    <span
      className={`avatar user-avatar user-avatar--${size} ${shouldShowImage ? "has-image" : ""} ${className}`.trim()}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : avatarLabel}
      role={decorative ? undefined : "img"}
    >
      {shouldShowImage ? (
        <img
          className="user-avatar__image"
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="user-avatar__fallback">{fallbackInitials}</span>
      )}
    </span>
  );
}
