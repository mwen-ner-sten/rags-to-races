"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function MobileSubNav({ tabs, activeTab, setActiveTab }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pick = useCallback(
    (id: string) => {
      setActiveTab(id);
      setOpen(false);
    },
    [setActiveTab],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? "";

  return (
    <div ref={containerRef} className="mobile-sub-nav" style={{ position: "relative" }}>
      {/* Trigger button — shows current tab name + chevron */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors w-full"
        style={{
          borderColor: "var(--panel-border, #3a2510)",
          background: "var(--panel-bg, #181008)",
          color: "var(--accent, #c83e0c)",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{activeLabel}</span>
        <span
          style={{
            fontSize: ".55rem",
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          &#9660;
        </span>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--panel-bg, #181008)",
            border: "1px solid var(--panel-border, #3a2510)",
            borderRadius: "0.5rem",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,.4)",
          }}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => pick(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: ".7rem 1rem",
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
                  transition: "color .12s, background .12s",
                }}
              >
                <span style={{ flex: 1 }}>{t.label}</span>
                {t.badge != null && t.badge > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                    style={{
                      background: isActive ? "rgba(255,255,255,.15)" : "var(--divider, #3a2810)",
                      fontSize: ".65rem",
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
