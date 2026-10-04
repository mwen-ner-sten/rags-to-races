"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { getThemeEntry, themeStyleVars } from "@/data/themes";
import type { TabId } from "@/components/navigation/tabs";
import Sidebar from "./Sidebar";
import MobileResourceStrip from "@/components/resources/MobileResourceStrip";
import ShellHeader from "./ShellHeader";
import ShellFooter from "./ShellFooter";
import ThemeDecoration from "./ThemeDecoration";

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  children: React.ReactNode;
}

/**
 * The single application shell. Its entire look comes from the active theme's
 * token set (src/data/themes.ts): the tokens are set as CSS variables on the
 * root element and mirrored onto <html> so portaled overlays match.
 *
 * One scrollable navigation sidebar; a modal drawer on small screens.
 */
export default function GameShell({ activeTab, setActiveTab, children }: Props) {
  const [theme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Server and first client render assume desktop (matches the SSR markup);
  // the CSS breakpoints keep the wrong surface hidden until this flips.
  const isMobile = useIsMobile();
  const entry = getThemeEntry(theme);
  const vars = themeStyleVars(theme);

  useEffect(() => {
    const root = document.documentElement;
    for (const [property, value] of Object.entries(themeStyleVars(theme))) {
      root.style.setProperty(property, value);
    }
    root.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <div className="shell-content">
        <div className="game-shell" data-theme={theme} style={vars as CSSProperties}>
          <ThemeDecoration decoration={entry.decoration} />
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} mobile={isMobile} open={menuOpen} close={closeMenu} />
          <ShellHeader activeTab={activeTab} setActiveTab={setActiveTab} tagline={entry.tagline} menuOpen={menuOpen} openMenu={() => setMenuOpen(true)} />
          <MobileResourceStrip activeTab={activeTab} />
          <main className="shell-main">{children}</main>
          <ShellFooter tagline={entry.tagline} />
        </div>
      </div>
    </>
  );
}
