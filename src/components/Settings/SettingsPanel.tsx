"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { THEMES } from "@/data/themes";
import SaveLoadPanel from "@/components/Shop/SaveLoadPanel";
import StartOverPanel from "@/components/Settings/StartOverPanel";
import { useGameStore } from "@/state/store";

export default function SettingsPanel() {
  const [theme, setTheme] = useTheme();
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const skipTutorial = useGameStore((s) => s.skipTutorial);
  const [skipConfirming, setSkipConfirming] = useState(false);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
  }, []);

  function handleSkipClick() {
    if (!skipConfirming) {
      setSkipConfirming(true);
      skipTimeoutRef.current = setTimeout(() => setSkipConfirming(false), 4000);
      return;
    }
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    setSkipConfirming(false);
    skipTutorial();
  }

  function handleRestartTutorial() {
    useGameStore.setState({
      tutorialStep: 0,
      tutorialDismissed: false,
      tutorialMinimized: false,
      tutorialLastAdvanceTime: Date.now(),
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Theme Selection */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Theme
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 8,
          }}
        >
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.8rem",
                  background: isActive ? t.bg : "transparent",
                  border: `1.5px solid ${isActive ? t.color : "rgba(255,255,255,.1)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all .15s",
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: t.color,
                    boxShadow: isActive ? `0 0 8px ${t.color}, 0 0 16px ${t.color}44` : "none",
                    display: "block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: isActive ? t.color : "rgba(255,255,255,.6)",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save / Load */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Save &amp; Load
        </h2>
        <SaveLoadPanel />
      </div>

      {/* Tutorial controls */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Tutorial
        </h2>
        <div
          style={{ borderColor: "var(--accent)", background: "var(--panel-bg)" }}
          className="flex flex-col gap-3 rounded-lg border p-4"
        >
          {tutorialStep >= 0 ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkipClick}
                  onMouseLeave={() => {
                    if (skipConfirming) {
                      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
                      setSkipConfirming(false);
                    }
                  }}
                  style={
                    skipConfirming
                      ? { borderColor: "var(--danger, #f87171)", color: "var(--danger, #f87171)" }
                      : { borderColor: "var(--accent)", color: "var(--accent)" }
                  }
                  className="rounded border px-4 py-2 text-sm font-semibold transition-all"
                >
                  {skipConfirming ? "Really skip? Click again" : "Skip Tutorial"}
                </button>
              </div>
              <p style={{ color: "var(--text-muted)" }} className="text-xs">
                Stuck? Force-skip the tutorial to unlock all tabs. You can restart it from here later.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={handleRestartTutorial}
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                className="self-start rounded border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
              >
                Restart Tutorial
              </button>
              <p style={{ color: "var(--text-muted)" }} className="text-xs">
                Brings the tutorial back from step 0. Handy if you skipped or dismissed by accident.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Danger Zone
        </h2>
        <StartOverPanel />
      </div>
    </div>
  );
}
