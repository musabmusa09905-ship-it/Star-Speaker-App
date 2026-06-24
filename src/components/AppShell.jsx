import { useState } from "react";
import { DesktopSidebar } from "./DesktopSidebar.jsx";
import { MobileBottomNav } from "./MobileBottomNav.jsx";
import { MobileDrawer } from "./MobileDrawer.jsx";
import { useSwipeDrawer } from "../lib/useSwipeDrawer.js";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "heartOfEnglishSidebarCollapsed";

export function AppShell({ activeTab, navItems, user, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const mobileSwipeHandlers = useSwipeDrawer({
    isOpen: isMobileMenuOpen,
    onOpen: openMobileMenu,
    onClose: closeMobileMenu
  });
  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((current) => {
      const nextValue = !current;

      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextValue));
      } catch {
        // Keep the UI responsive even if storage is unavailable.
      }

      return nextValue;
    });
  };

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""}`} {...mobileSwipeHandlers}>
      <DesktopSidebar
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        navItems={navItems}
        user={user}
        onToggleCollapsed={toggleSidebarCollapsed}
      />
      <button
        className="mobile-menu-trigger"
        type="button"
        aria-label="Open full navigation menu"
        aria-expanded={isMobileMenuOpen}
        onClick={openMobileMenu}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <MobileDrawer
        activeTab={activeTab}
        isOpen={isMobileMenuOpen}
        navItems={navItems}
        user={user}
        onClose={closeMobileMenu}
      />
      <main className="app-main" id="home">
        {children}
      </main>
      <MobileBottomNav activeTab={activeTab} navItems={navItems} />
    </div>
  );
}
