"use client";

import { useGameStore } from "@/state/store";

type TabId = "junkyard" | "garage" | "race" | "gear" | "upgrades" | "help" | "log" | "settings" | "dev";

const TABS: { id: TabId; label: string }[] = [
  { id: "junkyard", label: "Junkyard" },
  { id: "garage",   label: "Garage" },
  { id: "race",     label: "Race" },
  { id: "gear",     label: "Gear" },
  { id: "upgrades", label: "Upgrades" },
  { id: "help",     label: "Help" },
  { id: "log",      label: "Activity" },
  { id: "dev",      label: "Dev" },
];

const SHOW_DEV_TAB = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

interface Props {
  activeTab: string;
  setActiveTab: (t: TabId) => void;
  themeVars: Record<string, string>;
}

export default function DesktopSidebar({ activeTab, setActiveTab, themeVars }: Props) {
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);
  const visibleTabs = TABS.filter((t) => SHOW_DEV_TAB || t.id !== "dev");

  return (
    <aside
      className="desktop-sidebar"
      style={{
        ...themeVars as React.CSSProperties,
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 200,
        zIndex: 100,
        background: "var(--panel-bg, #181008)",
        borderRight: "1px solid var(--panel-border, #3a2510)",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: "1.25rem 1rem .75rem",
          borderBottom: "1px solid var(--panel-border, #3a2510)",
        }}
      >
        <div
          style={{
            fontSize: ".85rem",
            fontWeight: 800,
            letterSpacing: ".1em",
            color: "var(--accent, #c83e0c)",
            lineHeight: 1.2,
          }}
        >
          RAGS TO
          <br />
          RACES
        </div>
        {autoScavengeUnlocked && (
          <div
            style={{
              marginTop: ".5rem",
              fontSize: ".6rem",
              letterSpacing: ".12em",
              color: "var(--text-muted, #7a6040)",
            }}
          >
            <span style={{ color: "var(--accent, #c83e0c)" }}>&#9679;</span> AUTO
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <nav style={{ flex: 1, overflowY: "auto", padding: ".5rem 0" }}>
        {visibleTabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              data-tutorial-tab={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: ".6rem 1rem",
                background: isActive
                  ? "var(--accent-bg, rgba(200,62,12,.1))"
                  : "none",
                border: "none",
                borderLeft: isActive
                  ? "3px solid var(--accent, #c83e0c)"
                  : "3px solid transparent",
                color: isActive
                  ? "var(--accent, #c83e0c)"
                  : "var(--text-primary, #d4b896)",
                fontSize: ".8rem",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: ".06em",
                cursor: "pointer",
                textAlign: "left",
                transition: "color .12s, border-color .12s, background .12s",
              }}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div
        style={{
          borderTop: "1px solid var(--panel-border, #3a2510)",
          padding: ".25rem 0",
        }}
      >
        <button
          data-tutorial-tab="settings"
          onClick={() => setActiveTab("settings")}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: ".6rem 1rem",
            background: activeTab === "settings"
              ? "var(--accent-bg, rgba(200,62,12,.1))"
              : "none",
            border: "none",
            borderLeft:
              activeTab === "settings"
                ? "3px solid var(--accent, #c83e0c)"
                : "3px solid transparent",
            color:
              activeTab === "settings"
                ? "var(--accent, #c83e0c)"
                : "var(--text-muted, #7a6040)",
            fontSize: ".8rem",
            fontWeight: activeTab === "settings" ? 700 : 500,
            letterSpacing: ".06em",
            cursor: "pointer",
            textAlign: "left",
            transition: "color .12s, border-color .12s, background .12s",
          }}
        >
          &#9881; SETTINGS
        </button>
      </div>
    </aside>
  );
}
