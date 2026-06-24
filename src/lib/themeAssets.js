export const themeAssets = {
  light: {
    logo: "/assets/heart-of-english-logo-transparent.png",
    appIcon: "/app-icon.png",
    mascots: {
      celebration: "/mascots/mascot-celebration.png",
      encouragement: "/mascots/mascot-encouragement.png",
      explaining: "/mascots/mascot-explaining.png",
      progress: "/mascots/mascot-progress.png",
      thinking: "/mascots/mascot-thinking.png",
      welcome: "/mascots/mascot-welcome.png"
    }
  },
  dark: {
    logo: "/assets/logo-heart-of-english-dark-transparent.png",
    appIcon: "/assets/heart-of-english-app-icon-dark.png",
    mascots: {
      celebration: "/assets/mascot-celebration-dark.png",
      encouragement: "/assets/mascot-encouragement-dark.png",
      explaining: "/assets/mascot-explaining-dark.png",
      progress: "/assets/mascot-progress-dark.png",
      thinking: "/assets/mascot-thinking-dark.png",
      welcome: "/assets/mascot-welcome-dark.png"
    }
  }
};

export function getThemeAssets(isDarkMode) {
  return isDarkMode ? themeAssets.dark : themeAssets.light;
}

export function getLogoAsset(isDarkMode) {
  return {
    src: getThemeAssets(isDarkMode).logo,
    fallbackSrc: themeAssets.light.logo
  };
}

export function getAppIconAsset(isDarkMode) {
  return {
    src: getThemeAssets(isDarkMode).appIcon,
    fallbackSrc: themeAssets.light.appIcon
  };
}

export function normalizeMascotType(type) {
  if (type === "speaking") {
    return "explaining";
  }

  return themeAssets.light.mascots[type] ? type : "welcome";
}

export function getMascotAsset(type, isDarkMode) {
  const normalizedType = normalizeMascotType(type);

  return {
    src: getThemeAssets(isDarkMode).mascots[normalizedType] || themeAssets.light.mascots[normalizedType],
    fallbackSrc: themeAssets.light.mascots[normalizedType]
  };
}

export function replaceWithFallbackImage(event) {
  const fallbackSrc = event.currentTarget.dataset.fallbackSrc;

  if (!fallbackSrc) {
    return;
  }

  event.currentTarget.removeAttribute("data-fallback-src");
  event.currentTarget.setAttribute("src", fallbackSrc);
}
