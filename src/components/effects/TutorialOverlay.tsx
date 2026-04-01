"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/state/store";

/* ── Step definitions ─────────────────────────────────────────────────────── */

type TabId = "junkyard" | "garage" | "race" | "locker" | "workshop" | "shop" | "settings" | "dev";

interface TutorialStepDef {
  icon: string;
  tip: string;
  /** Tabs the player can click during this step. null = modal (no tabs). */
  allowedTabs: TabId[] | null;
  /** Tab to highlight with a pulse ring. */
  highlightTab?: TabId;
}

const PUSH_MOWER_ENGINES = new Set(["engine_small", "engine_lawn"]);
const PUSH_MOWER_WHEELS = new Set(["wheel_busted", "wheel_basic"]);

export const STEPS: TutorialStepDef[] = [
  // 0 — INTRO_CARD (modal)
  { icon: "\u{1F3CE}\uFE0F", tip: "", allowedTabs: null },
  // 1 — SCAVENGE
  { icon: "\u{1F5D1}\uFE0F", tip: "Hit **Scavenge** to dig through the curbside trash.", allowedTabs: ["junkyard"] },
  // 2 — COLLECT_PARTS
  { icon: "\u{1F9F0}", tip: "Keep scavenging! You need an **engine** and a **wheel** for your first ride.", allowedTabs: ["junkyard"] },
  // 3 — GO_TO_GARAGE
  { icon: "\u{1F449}", tip: "You've got the parts. Head to the **Garage** tab.", allowedTabs: ["junkyard", "garage"], highlightTab: "garage" },
  // 4 — BUILD_VEHICLE
  { icon: "\u{1F6E0}\uFE0F", tip: "Select the **Push Mower**, slot in your engine and wheel, and hit **Build**.", allowedTabs: ["garage"] },
  // 5 — ACTIVATE_VEHICLE
  { icon: "\u2B50", tip: "Now **Activate** your mower to set it as your racer.", allowedTabs: ["garage"] },
  // 6 — GO_TO_RACE
  { icon: "\u{1F449}", tip: "Time to race! Head to the **Race** tab.", allowedTabs: ["garage", "race"], highlightTab: "race" },
  // 7 — FIRST_RACE
  { icon: "\u{1F3C1}", tip: "Enter the **Backyard Derby** \u2014 held in Clyde's back forty.", allowedTabs: ["race"] },
  // 8 — KEEP_RACING
  { icon: "\u{1F680}", tip: "Keep racing and scavenging to earn **$500 lifetime scrap** and **25 Rep**.", allowedTabs: ["race", "junkyard", "garage"] },
  // 9 — GO_TO_SHOP
  { icon: "\u{1F449}", tip: "You're ready for a fresh start. Head to the **Shop** tab.", allowedTabs: ["race", "junkyard", "garage", "shop"], highlightTab: "shop" },
  // 10 — PRESTIGE
  { icon: "\u{1F510}", tip: "Hit **Scrap Reset** to prestige. You'll restart stronger with permanent bonuses.", allowedTabs: ["shop"] },
];

const TOTAL_GUIDED_STEPS = STEPS.length - 1; // exclude intro card from count

/** Returns the set of allowed tabs for a given tutorial step (-1 = all). */
export function getAllowedTabs(step: number): Set<TabId> | null {
  if (step < 0 || step >= STEPS.length) return null; // no restriction
  const allowed = STEPS[step].allowedTabs;
  return allowed ? new Set(allowed) : null;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/** Renders markdown-style **bold** in tip text. */
function renderTip(tip: string) {
  const parts = tip.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "var(--accent)" }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* ── Component ─────────────────────────────────────────────────────────────── */

interface Props {
  activeTab: TabId;
}

export default function TutorialOverlay({ activeTab }: Props) {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);

  // Game state for auto-advancement
  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const raceHistory = useGameStore((s) => s.raceHistory);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const prestigeCount = useGameStore((s) => s.prestigeCount);

  // Tab highlight positioning
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [blockerRects, setBlockerRects] = useState<{ rect: DOMRect; idx: number }[]>([]);
  const rafRef = useRef<number>(0);

  const stepDef = tutorialStep >= 0 && tutorialStep < STEPS.length ? STEPS[tutorialStep] : null;

  /* ── Auto-advance logic ──────────────────────────────────────────────── */
  useEffect(() => {
    if (tutorialStep < 0) return;

    let shouldAdvance = false;

    switch (tutorialStep) {
      case 1: // SCAVENGE — any part found
        shouldAdvance = inventory.length > 0;
        break;
      case 2: // COLLECT_PARTS — engine + wheel for push mower
        {
          const hasEngine = inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
          const hasWheel = inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
          shouldAdvance = hasEngine && hasWheel;
        }
        break;
      case 3: // GO_TO_GARAGE
        shouldAdvance = activeTab === "garage";
        break;
      case 4: // BUILD_VEHICLE
        shouldAdvance = garage.length > 0;
        break;
      case 5: // ACTIVATE_VEHICLE
        shouldAdvance = activeVehicleId !== null;
        break;
      case 6: // GO_TO_RACE
        shouldAdvance = activeTab === "race";
        break;
      case 7: // FIRST_RACE
        shouldAdvance = raceHistory.length > 0;
        break;
      case 8: // KEEP_RACING
        shouldAdvance = repPoints >= 25 && lifetimeScrapBucks >= 500;
        break;
      case 9: // GO_TO_SHOP
        shouldAdvance = activeTab === "shop";
        break;
      case 10: // PRESTIGE
        shouldAdvance = prestigeCount > 0;
        break;
      default:
        break;
    }

    if (shouldAdvance) {
      advanceTutorial();
    }
  }, [tutorialStep, inventory, garage, activeVehicleId, raceHistory, repPoints, lifetimeScrapBucks, prestigeCount, activeTab, advanceTutorial]);

  // When tutorialStep hits 11 (COMPLETE), finalize
  useEffect(() => {
    if (tutorialStep >= STEPS.length) {
      // Show a brief toast then mark done
      useGameStore.setState((s) => ({
        tutorialStep: -1,
        unlockEvents: [...s.unlockEvents, "Tutorial complete! The world is yours now."],
      }));
    }
  }, [tutorialStep]);

  /* ── Tab spotlight positioning ───────────────────────────────────────── */
  const updatePositions = useCallback(() => {
    if (!stepDef) {
      setHighlightRect(null);
      setBlockerRects([]);
      return;
    }

    const nav = document.querySelector("nav");
    if (!nav) return;

    const buttons = Array.from(nav.querySelectorAll("button")) as HTMLButtonElement[];
    // Filter to only tab buttons (exclude settings footer button, etc.)
    // Tab buttons have text matching tab labels
    const tabLabels = ["junkyard", "garage", "race", "locker", "workshop", "shop", "settings", "dev"];
    const tabButtons = buttons.filter((btn) => {
      const text = btn.textContent?.toLowerCase().trim() ?? "";
      return tabLabels.some((l) => text.includes(l));
    });

    const allowedSet = stepDef.allowedTabs ? new Set(stepDef.allowedTabs) : null;

    // Highlight target tab
    if (stepDef.highlightTab) {
      const target = tabButtons.find((btn) =>
        btn.textContent?.toLowerCase().trim().includes(stepDef.highlightTab!)
      );
      setHighlightRect(target ? target.getBoundingClientRect() : null);
    } else {
      setHighlightRect(null);
    }

    // Blocked tab overlays
    if (allowedSet) {
      const blocked: { rect: DOMRect; idx: number }[] = [];
      tabButtons.forEach((btn, idx) => {
        const text = btn.textContent?.toLowerCase().trim() ?? "";
        const tabId = tabLabels.find((l) => text.includes(l));
        if (tabId && !allowedSet.has(tabId as TabId)) {
          blocked.push({ rect: btn.getBoundingClientRect(), idx });
        }
      });
      setBlockerRects(blocked);
    } else {
      setBlockerRects([]);
    }
  }, [stepDef]);

  useEffect(() => {
    if (tutorialStep < 0) return;

    const update = () => {
      updatePositions();
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(rafRef.current);
  }, [tutorialStep, updatePositions]);

  /* ── Render nothing if tutorial is done ──────────────────────────────── */
  if (tutorialStep < 0 || !stepDef) return null;

  /* ── Step 0: Intro card modal ────────────────────────────────────────── */
  if (tutorialStep === 0) {
    return (
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="animate-fade-up mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl"
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
        >
          <div className="mb-3 text-center text-4xl">{"\u{1F3CE}\uFE0F"}</div>
          <h2 className="mb-2 text-center text-lg font-bold" style={{ color: "var(--text-heading)" }}>
            Welcome to Rags to Races
          </h2>
          <p className="mb-3 text-center text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            You&apos;ve got nothing but the clothes on your back and a curb full of someone else&apos;s trash.
            Time to turn that garbage into glory.
          </p>
          <p className="mb-6 text-center text-xs italic" style={{ color: "var(--text-muted)" }}>
            Scavenge parts. Build a ride. Race your way to the top.
          </p>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={skipTutorial}
              className="cursor-pointer text-xs underline opacity-60 transition-opacity hover:opacity-100"
              style={{ color: "var(--text-muted)" }}
            >
              Skip tutorial
            </button>
            <button
              onClick={advanceTutorial}
              className="cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              Let&apos;s Go
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Steps 1-10: Guided overlay ──────────────────────────────────────── */
  const guidedStep = tutorialStep; // 1-based for display

  return (
    <>
      {/* Blocked-tab overlays */}
      {blockerRects.map(({ rect, idx }) => (
        <div
          key={idx}
          className="fixed z-[9997]"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            background: "rgba(0,0,0,0.5)",
            cursor: "not-allowed",
            pointerEvents: "auto",
          }}
        />
      ))}

      {/* Highlight pulse on target tab */}
      {highlightRect && (
        <div
          className="tutorial-pulse fixed z-[9997] rounded"
          style={{
            left: highlightRect.left - 3,
            top: highlightRect.top - 3,
            width: highlightRect.width + 6,
            height: highlightRect.height + 6,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Floating tip bar */}
      <div
        className="fixed bottom-16 left-1/2 z-[10000] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 sm:bottom-4"
        style={{ pointerEvents: "auto" }}
      >
        <div
          className="animate-fade-up flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm"
          style={{
            background: "var(--panel-bg)",
            borderColor: "var(--accent-border, var(--panel-border))",
          }}
        >
          <span className="shrink-0 text-2xl">{stepDef.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {renderTip(stepDef.tip)}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Step {guidedStep} of {TOTAL_GUIDED_STEPS}
            </p>
          </div>
          <button
            onClick={skipTutorial}
            className="shrink-0 cursor-pointer text-xs underline opacity-50 transition-opacity hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            Skip
          </button>
        </div>
      </div>
    </>
  );
}
