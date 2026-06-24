import { useTheme } from "../lib/theme.js";
import { getLogoAsset, replaceWithFallbackImage } from "../lib/themeAssets.js";

export function BrandLogo({ compact = false, className = "" }) {
  const { isDark } = useTheme();
  const logoAsset = getLogoAsset(isDark);

  return (
    <a
      className={`brand-logo ${compact ? "brand-logo--compact" : ""} ${className}`}
      href="/"
      aria-label="Star Speaker home"
    >
      <img
        src={logoAsset.src}
        data-fallback-src={logoAsset.fallbackSrc}
        alt="Star Speaker"
        className="brand-logo__image"
        onError={replaceWithFallbackImage}
      />
      <span className="brand-logo__fallback">Star Speaker</span>
    </a>
  );
}
