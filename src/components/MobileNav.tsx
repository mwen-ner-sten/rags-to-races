"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type TabId = "junkyard" | "garage" | "race" | "gear" | "upgrades" | "help" | "log" | "settings" | "dev";

/** Primary tabs shown directly in the bottom bar */
const PRIMARY_TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "junkyard", label: "Junk",    icon: "\u{1F5D1}\uFE0F" },  // 🗑️
  { id: "garage",   label: "Garage",  icon: "\u{1F527}" },          // 🔧
  { id: "race",     label: "Race",    icon: "\u{1F3CE}\uFE0F" },   // 🏎️
  { id: "gear",     label: "Gear",    icon: "\u{1F9F0}" },          // 🧰
  { id: "upgrades", label: "Upgr",    icon: "\u2B06\uFE0F" },      // ⬆️
];

/** Overflow tabs behind the "More" button */
const OVERFLOW_TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "help",     label: "Help",     icon: "\u2753" },    // ❓
  { id: "log",      label: "Activity", icon: "\u{1F4DC}" }, // 📜
  { id: "settings", label: "Settings", icon: "\u2699\uFE0F" }, // ⚙️
];

const SHOW_DEV_TAB = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

interface Props {
  activeTab: string;
  setActiveTab: (t: TabId) => void;
  themeVars: Record<string, string>;
}

export default function MobileNav({ activeTab, setActiveTab, themeVars }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const pick = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      setMoreOpen(false);
    },
    [setActiveTab],
  );

  // Close popover on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  // Close on Escape
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moreOpen]);

  const overflowTabs = SHOW_DEV_TAB
    ? [...OVERFLOW_TABS, { id: "dev" as TabId, label: "Dev", icon: "\u{1F6E0}\uFE0F" }]
    : OVERFLOW_TABS;

  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);

  return (
    <div className="mobile-nav" style={{ ...themeVars as React.CSSProperties }}>
      {/* Bottom tab bar */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 56,
          display: "flex",
          alignItems: "stretch",
          background: "var(--panel-bg, #181008)",
          borderTop: "1px solid var(--panel-border, #3a2510)",
          boxShadow: "0 -2px 12px rgba(0,0,0,.4)",
        }}
      >
        {PRIMARY_TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: "none",
                border: "none",
                borderTop: isActive
                  ? "2px solid var(--accent, #c83e0c)"
                  : "2px solid transparent",
                color: isActive
                  ? "var(--accent, #c83e0c)"
                  : "var(--text-muted, #7a6040)",
                cursor: "pointer",
                transition: "color .12s, border-color .12s",
                padding: "4px 0 2px",
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{t.icon}</span>
              <span
                style={{
                  fontSize: ".58rem",
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}

        {/* More button + popover */}
        <div ref={moreRef} style={{ flex: 1, position: "relative" }}>
          <button
            data-tutorial="mobile-more"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="More tabs"
            aria-expanded={moreOpen}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "none",
              border: "none",
              borderTop: isOverflowActive
                ? "2px solid var(--accent, #c83e0c)"
                : "2px solid transparent",
              color: isOverflowActive || moreOpen
                ? "var(--accent, #c83e0c)"
                : "var(--text-muted, #7a6040)",
              cursor: "pointer",
              transition: "color .12s, border-color .12s",
              padding: "4px 0 2px",
            }}
          >
            <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{"\u2022\u2022\u2022"}</span>
            <span
              style={{
                fontSize: ".58rem",
                fontWeight: isOverflowActive ? 700 : 500,
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              More
            </span>
          </button>

          {/* Popover */}
          {moreOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                minWidth: 150,
                background: "var(--panel-bg, #181008)",
                border: "1px solid var(--panel-border, #3a2510)",
                borderRadius: 8,
                boxShadow: "0 -4px 20px rgba(0,0,0,.5)",
                overflow: "hidden",
                zIndex: 1001,
              }}
            >
              {overflowTabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => pick(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: ".7rem 1rem",
                      background: isActive
                        ? "var(--accent-bg, rgba(200,62,12,.1))"
                        : "none",
                      border: "none",
                      color: isActive
                        ? "var(--accent, #c83e0c)"
                        : "var(--text-primary, #d4b896)",
                      fontSize: ".85rem",
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "color .12s, background .12s",
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
