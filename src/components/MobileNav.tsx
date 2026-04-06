"use client";

import { useState, useCallback, useEffect } from "react";
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

export default function MobileNav({ activeTab, setActiveTab, themeVars }: Props) {
  const [open, setOpen] = useState(false);
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const pick = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      setOpen(false);
    },
    [setActiveTab],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const visibleTabs = TABS.filter((t) => SHOW_DEV_TAB || t.id !== "dev");
  const activeLabel = visibleTabs.find((t) => t.id === activeTab)?.label ?? "";

  return (
    <div className="mobile-nav" style={{ ...themeVars as React.CSSProperties }}>
      {/* Backdrop */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            zIndex: 998,
          }}
        />
      )}

      {/* Slide-up drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          background: "var(--panel-bg, #181008)",
          borderTop: "1px solid var(--panel-border, #3a2510)",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform .25s cubic-bezier(.4,0,.2,1)",
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "0.5rem 0",
        }}
      >
        {visibleTabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: ".85rem 1.25rem",
                background: "none",
                border: "none",
                borderLeft: isActive
                  ? "3px solid var(--accent, #c83e0c)"
                  : "3px solid transparent",
                color: isActive
                  ? "var(--accent, #c83e0c)"
                  : "var(--text-primary, #d4b896)",
                fontSize: ".95rem",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: ".06em",
                cursor: "pointer",
                textAlign: "left",
                transition: "color .12s, border-color .12s",
              }}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}

        {/* Settings shortcut */}
        <button
          onClick={() => pick("settings")}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: ".85rem 1.25rem",
            background: "none",
            border: "none",
            borderLeft:
              activeTab === "settings"
                ? "3px solid var(--accent, #c83e0c)"
                : "3px solid transparent",
            color:
              activeTab === "settings"
                ? "var(--accent, #c83e0c)"
                : "var(--text-muted, #7a6040)",
            fontSize: ".95rem",
            fontWeight: activeTab === "settings" ? 700 : 500,
            letterSpacing: ".06em",
            cursor: "pointer",
            textAlign: "left",
            transition: "color .12s, border-color .12s",
          }}
        >
          &#9881; SETTINGS
        </button>
      </div>

      {/* Hamburger FAB */}
      <button
        onClick={toggle}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid var(--panel-border, #3a2510)",
          background: "var(--panel-bg, #181008)",
          boxShadow: "0 2px 12px rgba(0,0,0,.5)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: open ? 0 : 4,
          transition: "gap .2s",
        }}
      >
        {/* Three bars → X morph */}
        <span
          style={{
            display: "block",
            width: 20,
            height: 2,
            borderRadius: 1,
            background: "var(--accent, #c83e0c)",
            transition: "transform .2s, opacity .2s",
            transform: open ? "translateY(3px) rotate(45deg)" : "none",
          }}
        />
        <span
          style={{
            display: "block",
            width: 20,
            height: 2,
            borderRadius: 1,
            background: "var(--accent, #c83e0c)",
            transition: "opacity .2s",
            opacity: open ? 0 : 1,
          }}
        />
        <span
          style={{
            display: "block",
            width: 20,
            height: 2,
            borderRadius: 1,
            background: "var(--accent, #c83e0c)",
            transition: "transform .2s, opacity .2s",
            transform: open ? "translateY(-3px) rotate(-45deg)" : "none",
          }}
        />
      </button>

      {/* Active tab label next to FAB */}
      {!open && (
        <div
          style={{
            position: "fixed",
            bottom: "1.65rem",
            right: "4.5rem",
            zIndex: 1000,
            fontSize: ".6rem",
            fontWeight: 700,
            letterSpacing: ".15em",
            color: "var(--accent, #c83e0c)",
            textTransform: "uppercase",
            pointerEvents: "none",
            textShadow: "0 1px 4px rgba(0,0,0,.6)",
          }}
        >
          {activeLabel || (activeTab === "settings" ? "SETTINGS" : "")}
          {autoScavengeUnlocked && (
            <span style={{ marginLeft: ".5rem", color: "var(--text-muted, #7a6040)" }}>
              &#9679; AUTO
            </span>
          )}
        </div>
      )}
    </div>
  );
}
