import "./MascotFrame.css";

const VALID_SIZES = new Set(["xs", "sm", "md", "lg", "empty"]);
const VALID_TONES = new Set(["plain", "card", "soft", "dark"]);

export function MascotFrame({
  src,
  alt = "",
  size = "sm",
  tone = "soft",
  className = "",
  imageClassName = "",
  animated = false,
  children,
  ...imageProps
}) {
  const resolvedSize = VALID_SIZES.has(size) ? size : "sm";
  const resolvedTone = VALID_TONES.has(tone) ? tone : "soft";

  return (
    <span
      className={[
        "mascot-frame",
        `mascot-frame--${resolvedSize}`,
        `mascot-frame--${resolvedTone}`,
        animated ? "is-animated" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src && (
        <img
          className={["mascot-frame__image", imageClassName].filter(Boolean).join(" ")}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          {...imageProps}
        />
      )}
      {children}
    </span>
  );
}
