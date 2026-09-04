"use client";

import { useEffect, type CSSProperties } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { getThemeEntry, themeStyleVars } from "@/data/themes";
import type { TabId } from "@/components/navigation/tabs";
import MobileNav from "@/components/MobileNav";
import ResourceRail from "@/components/resources/ResourceRail";
import MobileResourceStrip from "@/components/resources/MobileResourceStrip";
import ShellHeader from "./ShellHeader";
import ShellFooter from "./ShellFooter";
import TabBar from "./TabBar";
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
 * Layout (see globals.css):
 *   desktop  — fixed 240px resource rail on the left; header, tab bar, main,
 *              footer to its right (.shell-content reserves the margin).
 *   mobile   — header, collapsible resource strip, main, footer; MobileNav
 *              is the fixed bottom bar (.shell-content reserves 56px + inset).
 */
export default function GameShell({ activeTab, setActiveTab, children }: Props) {
  const [theme] = useTheme();
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
          <ShellHeader activeTab={activeTab} setActiveTab={setActiveTab} tagline={entry.tagline} />
          {isMobile ? (
            <MobileResourceStrip activeTab={activeTab} />
          ) : (
            <>
              <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
              <ResourceRail />
            </>
          )}
          <main className="shell-main">{children}</main>
          <ShellFooter tagline={entry.tagline} />
        </div>
      </div>
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} themeVars={vars} />
    </>
  );
}
