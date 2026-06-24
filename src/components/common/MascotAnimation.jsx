import { useTheme } from "../../lib/theme.js";
import {
  getMascotAsset,
  normalizeMascotType,
  replaceWithFallbackImage,
  themeAssets
} from "../../lib/themeAssets.js";
import { MascotFrame } from "./MascotFrame.jsx";
import "./MascotAnimation.css";

const MASCOT_TYPES = {
  welcome: {
    label: "Welcome",
    src: themeAssets.light.mascots.welcome
  },
  explaining: {
    label: "Explaining",
    src: themeAssets.light.mascots.explaining
  },
  speaking: {
    label: "Explaining",
    src: themeAssets.light.mascots.explaining
  },
  celebration: {
    label: "Celebration",
    src: themeAssets.light.mascots.celebration
  },
  thinking: {
    label: "Thinking",
    src: themeAssets.light.mascots.thinking
  },
  encouragement: {
    label: "Encouragement",
    src: themeAssets.light.mascots.encouragement
  },
  progress: {
    label: "Progress",
    src: themeAssets.light.mascots.progress
  }
};

const VALID_SIZES = new Set(["small", "medium", "large", "hero"]);
const VALID_MOTIONS = new Set(["idle", "wave", "celebrate", "thinking", "progress", "attention", "static"]);

const FRAME_SIZES = {
  small: "sm",
  medium: "md",
  large: "lg",
  hero: "empty"
};

const DEFAULT_MOTIONS = {
  welcome: "idle",
  explaining: "idle",
  speaking: "idle",
  celebration: "celebrate",
  thinking: "thinking",
  encouragement: "attention",
  progress: "progress"
};

function getTypeConfig(type) {
  return MASCOT_TYPES[type] || MASCOT_TYPES.welcome;
}

function getMotion(motion, type) {
  if (VALID_MOTIONS.has(motion)) {
    return motion;
  }

  return DEFAULT_MOTIONS[type] || "idle";
}

function Decorations({ type }) {
  if (type === "welcome") {
    return (
      <span className="mascot-decoration mascot-decoration--greeting" aria-hidden="true">
        <span />
      </span>
    );
  }

  if (type === "speaking" || type === "explaining") {
    return (
      <span className="mascot-decoration mascot-decoration--speech" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  }

  if (type === "celebration") {
    return (
      <span className="mascot-decoration mascot-decoration--confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }

  if (type === "thinking") {
    return (
      <span className="mascot-decoration mascot-decoration--thought" aria-hidden="true">
        ?
      </span>
    );
  }

  if (type === "encouragement") {
    return <span className="mascot-decoration mascot-decoration--heart-glow" aria-hidden="true" />;
  }

  if (type === "progress") {
    return (
      <span className="mascot-decoration mascot-decoration--progress" aria-hidden="true">
        <i />
        <i />
        <i />
        <b />
      </span>
    );
  }

  return null;
}

export function MascotAnimation({
  type = "welcome",
  src,
  size = "medium",
  motion,
  className = "",
  loop,
  showDecorations = true,
  label
}) {
  const { isDark } = useTheme();
  const config = getTypeConfig(type);
  const resolvedType = normalizeMascotType(type);
  const resolvedSize = VALID_SIZES.has(size) ? size : "medium";
  const resolvedMotion = getMotion(motion, resolvedType);
  const shouldLoop = typeof loop === "boolean" ? loop : resolvedType !== "celebration";
  const alt = label || `${config.label} Heart of English mascot`;
  const mascotAsset = getMascotAsset(type, isDark);
  const imageSrc = src || mascotAsset.src;
  const fallbackSrc = src ? config.src : mascotAsset.fallbackSrc;
  const frameSize = FRAME_SIZES[resolvedSize] || "md";
  const frameTone = resolvedSize === "hero" ? "card" : "soft";
  const shouldShowDecorations = showDecorations && (resolvedSize !== "small" || resolvedType === "celebration");

  return (
    <figure
      className={[
        "mascot-animation",
        `mascot-animation--${resolvedType}`,
        `mascot-animation--${resolvedSize}`,
        `mascot-${resolvedMotion}`,
        shouldLoop ? "is-looping" : "is-once",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {shouldShowDecorations && <Decorations type={resolvedType} />}
      <MascotFrame
        src={imageSrc}
        alt={alt}
        size={frameSize}
        tone={frameTone}
        animated={resolvedMotion !== "static"}
        className="mascot-animation__frame"
        imageClassName="mascot-animation__image"
        data-fallback-src={fallbackSrc}
        onError={replaceWithFallbackImage}
      />
    </figure>
  );
}
