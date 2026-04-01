"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type TabId = "junkyard" | "garage" | "race" | "locker" | "workshop" | "shop" | "settings" | "dev";

interface TutorialStepDef {
  icon: string;
  /** Main tip shown in the positioned card. Supports **bold** markdown. */
  tip: string;
  /** Tabs the player can click. null = modal (intro card). */
  allowedTabs: TabId[] | null;
  /** Tab to highlight with a pulse ring. */
  highlightTab?: TabId;
  /** data-tutorial value of the element to anchor the card near. */
  target?: string;
  /** If true, card hides after first relevant action; goal badge shows instead. */
  hasGoal?: boolean;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const PUSH_MOWER_ENGINES = new Set(["engine_small", "engine_lawn"]);
const PUSH_MOWER_WHEELS = new Set(["wheel_busted", "wheel_basic"]);

export const STEPS: TutorialStepDef[] = [
  // 0 — INTRO CARD (full-screen modal)
  { icon: "\u{1F3CE}\uFE0F", tip: "", allowedTabs: null },
  // 1 — SCAVENGE: click the button
  { icon: "\u{1F5D1}\uFE0F", tip: "Click **Scavenge** to search the curb for parts.", allowedTabs: ["junkyard"], target: "scavenge-btn" },
  // 2 — COLLECT PARTS: keep scavenging until engine + wheel
  { icon: "\u{1F9F0}", tip: "Keep scavenging \u2014 you need an **engine** and a **wheel** to build your first ride.", allowedTabs: ["junkyard"], target: "scavenge-btn", hasGoal: true },
  // 3 — SELL JUNK: sell spare parts for cash
  { icon: "\u{1F4B0}", tip: "Sell spare parts for **Scrap Bucks** \u2014 you\u2019ll need **$10** to build.", allowedTabs: ["junkyard"], target: "sell-area", hasGoal: true },
  // 4 — GO TO GARAGE
  { icon: "\u{1F449}", tip: "You\u2019ve got parts and cash. Head to the **Garage** tab.", allowedTabs: ["junkyard", "garage"], highlightTab: "garage" },
  // 5 — BUILD VEHICLE
  { icon: "\u{1F6E0}\uFE0F", tip: "Select the **Push Mower**, slot in your engine and wheel, and hit **Build**.", allowedTabs: ["garage", "junkyard"], target: "build-btn" },
  // 6 — ACTIVATE
  { icon: "\u2B50", tip: "**Activate** your mower to set it as your racer.", allowedTabs: ["garage"], target: "activate-btn" },
  // 7 — GO TO RACE
  { icon: "\u{1F449}", tip: "Time to race! Head to the **Race** tab.", allowedTabs: ["garage", "race"], highlightTab: "race" },
  // 8 — FIRST RACE
  { icon: "\u{1F3C1}", tip: "Enter the **Backyard Derby** \u2014 held in Clyde\u2019s back forty.", allowedTabs: ["race"], target: "race-btn" },
  // 9 — KEEP RACING (grind phase — goal badge only, no card)
  { icon: "\u{1F680}", tip: "Keep racing and scavenging to earn **$500 lifetime scrap** and **25 Rep**.", allowedTabs: ["race", "junkyard", "garage"], hasGoal: true },
  // 10 — GO TO SHOP
  { icon: "\u{1F449}", tip: "You\u2019re ready for a fresh start. Head to the **Shop** tab.", allowedTabs: ["race", "junkyard", "garage", "shop"], highlightTab: "shop" },
  // 11 — PRESTIGE
  { icon: "\u{1F510}", tip: "Hit **Scrap Reset** to prestige. You\u2019ll restart stronger with permanent bonuses.", allowedTabs: ["shop"], target: "prestige-btn" },
];

const TOTAL_GUIDED_STEPS = STEPS.length - 1; // exclude intro card

/** Returns allowed tabs for a step, or null (= unrestricted). */
export function getAllowedTabs(step: number): Set<TabId> | null {
  if (step < 0 || step >= STEPS.length) return null;
  const allowed = STEPS[step].allowedTabs;
  return allowed ? new Set(allowed) : null;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

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

  // Game state for auto-advancement & goal badges
  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const raceHistory = useGameStore((s) => s.raceHistory);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const prestigeCount = useGameStore((s) => s.prestigeCount);

  // Card dismissed = show goal badge instead (for hasGoal steps)
  const [cardDismissed, setCardDismissed] = useState(false);
  // Positioned card anchor rect
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  // Tab highlight + blockers
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [blockerRects, setBlockerRects] = useState<{ rect: DOMRect; idx: number }[]>([]);
  const rafRef = useRef<number>(0);

  const stepDef = tutorialStep >= 0 && tutorialStep < STEPS.length ? STEPS[tutorialStep] : null;

  // Reset cardDismissed when step changes
  useEffect(() => {
    setCardDismissed(false);
  }, [tutorialStep]);

  /* ── Auto-advance ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (tutorialStep < 0) return;
    let shouldAdvance = false;

    switch (tutorialStep) {
      case 1: // SCAVENGE — first part found
        if (inventory.length > 0) { shouldAdvance = true; }
        break;
      case 2: { // COLLECT_PARTS — engine + wheel
        const hasEngine = inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
        const hasWheel = inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
        if (hasEngine && hasWheel) shouldAdvance = true;
        break;
      }
      case 3: // SELL_JUNK — enough cash to build
        if (scrapBucks >= 10) shouldAdvance = true;
        break;
      case 4: // GO_TO_GARAGE
        if (activeTab === "garage") shouldAdvance = true;
        break;
      case 5: // BUILD
        if (garage.length > 0) shouldAdvance = true;
        break;
      case 6: // ACTIVATE
        if (activeVehicleId !== null) shouldAdvance = true;
        break;
      case 7: // GO_TO_RACE
        if (activeTab === "race") shouldAdvance = true;
        break;
      case 8: // FIRST_RACE
        if (raceHistory.length > 0) shouldAdvance = true;
        break;
      case 9: // KEEP_RACING
        if (repPoints >= 25 && lifetimeScrapBucks >= 500) shouldAdvance = true;
        break;
      case 10: // GO_TO_SHOP
        if (activeTab === "shop") shouldAdvance = true;
        break;
      case 11: // PRESTIGE
        if (prestigeCount > 0) shouldAdvance = true;
        break;
    }

    if (shouldAdvance) advanceTutorial();
  }, [tutorialStep, inventory, garage, activeVehicleId, raceHistory, repPoints, lifetimeScrapBucks, scrapBucks, prestigeCount, activeTab, advanceTutorial]);

  // When step exceeds STEPS, finalize
  useEffect(() => {
    if (tutorialStep >= STEPS.length) {
      useGameStore.setState((s) => ({
        tutorialStep: -1,
        unlockEvents: [...s.unlockEvents, "Tutorial complete! The world is yours now."],
      }));
    }
  }, [tutorialStep]);

  // Dismiss card after first relevant action on hasGoal steps
  useEffect(() => {
    if (!stepDef?.hasGoal || cardDismissed) return;

    // For step 2 (COLLECT_PARTS): dismiss after first scavenge (they already have 1+ part from step 1)
    if (tutorialStep === 2 && inventory.length > 1) setCardDismissed(true);
    // For step 3 (SELL_JUNK): dismiss once they have any scrap bucks
    if (tutorialStep === 3 && scrapBucks > 0) setCardDismissed(true);
    // For step 9 (KEEP_RACING): always show goal, never show card
    if (tutorialStep === 9) setCardDismissed(true);
  }, [tutorialStep, stepDef, cardDismissed, inventory.length, scrapBucks]);

  /* ── Position tracking ───────────────────────────────────────────────── */
  const updatePositions = useCallback(() => {
    if (!stepDef) { setTargetRect(null); setHighlightRect(null); setBlockerRects([]); return; }

    // Target element for card positioning
    if (stepDef.target && !cardDismissed) {
      const el = document.querySelector(`[data-tutorial="${stepDef.target}"]`);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    } else {
      setTargetRect(null);
    }

    // Nav buttons for tab highlight + blockers
    const nav = document.querySelector("nav");
    if (!nav) { setHighlightRect(null); setBlockerRects([]); return; }

    const tabLabels: TabId[] = ["junkyard", "garage", "race", "locker", "workshop", "shop", "settings", "dev"];
    const buttons = Array.from(nav.querySelectorAll("button")) as HTMLButtonElement[];
    const tabButtons = buttons.filter((btn) => {
      const text = btn.textContent?.toLowerCase().trim() ?? "";
      return tabLabels.some((l) => text.includes(l));
    });

    const allowedSet = stepDef.allowedTabs ? new Set(stepDef.allowedTabs) : null;

    // Highlight target tab
    if (stepDef.highlightTab) {
      const target = tabButtons.find((btn) => btn.textContent?.toLowerCase().trim().includes(stepDef.highlightTab!));
      setHighlightRect(target ? target.getBoundingClientRect() : null);
    } else {
      setHighlightRect(null);
    }

    // Blocked tabs
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
  }, [stepDef, cardDismissed]);

  useEffect(() => {
    if (tutorialStep < 0) return;
    const update = () => { updatePositions(); rafRef.current = requestAnimationFrame(update); };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tutorialStep, updatePositions]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (tutorialStep < 0 || !stepDef) return null;

  /* Step 0: Intro card modal */
  if (tutorialStep === 0) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
        <div className="animate-fade-up mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
          <div className="mb-3 text-center text-4xl">{"\u{1F3CE}\uFE0F"}</div>
          <h2 className="mb-2 text-center text-lg font-bold" style={{ color: "var(--text-heading)" }}>Welcome to Rags to Races</h2>
          <p className="mb-3 text-center text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            You&apos;ve got nothing but the clothes on your back and a curb full of someone else&apos;s trash.
            Time to turn that garbage into glory.
          </p>
          <p className="mb-6 text-center text-xs italic" style={{ color: "var(--text-muted)" }}>Scavenge parts. Build a ride. Race your way to the top.</p>
          <div className="flex items-center justify-between gap-3">
            <button onClick={skipTutorial} className="cursor-pointer text-xs underline opacity-60 transition-opacity hover:opacity-100" style={{ color: "var(--text-muted)" }}>Skip tutorial</button>
            <button onClick={advanceTutorial} className="cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-colors" style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}>Let&apos;s Go</button>
          </div>
        </div>
      </div>
    );
  }

  /* Steps 1+: Guided overlay */
  const showCard = !cardDismissed && stepDef.tip;
  const showGoal = cardDismissed && stepDef.hasGoal;
  const guidedStep = tutorialStep;

  // Compute card position near target element
  let cardStyle: React.CSSProperties = {};
  if (showCard && targetRect) {
    const viewW = typeof window !== "undefined" ? window.innerWidth : 800;
    const viewH = typeof window !== "undefined" ? window.innerHeight : 600;
    const cardW = Math.min(360, viewW - 32);
    // Prefer placing above the target; if no room, place below
    const above = targetRect.top > 200;
    const left = Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - cardW / 2, viewW - cardW - 16));
    const top = above ? targetRect.top - 12 : targetRect.bottom + 12;
    cardStyle = {
      position: "fixed",
      left,
      top: above ? undefined : top,
      bottom: above ? viewH - top : undefined,
      width: cardW,
      zIndex: 10000,
    };
  } else if (showCard) {
    // Fallback: bottom center
    cardStyle = {
      position: "fixed",
      bottom: 64,
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(360px, calc(100% - 2rem))",
      zIndex: 10000,
    };
  }

  // Goal badge content
  let goalContent: React.ReactNode = null;
  if (showGoal) {
    if (tutorialStep === 2) {
      const hasEngine = inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
      const hasWheel = inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
      goalContent = (
        <span>
          Engine {hasEngine ? "\u2705" : "\u274C"} {" \u00B7 "} Wheel {hasWheel ? "\u2705" : "\u274C"}
        </span>
      );
    } else if (tutorialStep === 3) {
      goalContent = <span>${formatNumber(scrapBucks)} / $10</span>;
    } else if (tutorialStep === 9) {
      goalContent = (
        <span>
          ${formatNumber(lifetimeScrapBucks)} / $500 {" \u00B7 "} {formatNumber(repPoints)} / 25 Rep
        </span>
      );
    }
  }

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

      {/* Positioned tutorial card */}
      {showCard && (
        <div style={cardStyle}>
          <div
            className="animate-fade-up flex items-start gap-3 rounded-xl border p-3 shadow-xl"
            style={{
              background: "var(--panel-bg)",
              borderColor: "var(--accent-border, var(--panel-border))",
            }}
          >
            <span className="shrink-0 text-xl">{stepDef.icon}</span>
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
      )}

      {/* Goal badge — small persistent indicator */}
      {showGoal && goalContent && (
        <div
          className="fixed top-2 left-1/2 z-[10000] -translate-x-1/2 sm:top-16"
        >
          <div
            className="animate-fade-up flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-lg"
            style={{
              background: "var(--panel-bg)",
              borderColor: "var(--accent-border, var(--panel-border))",
              color: "var(--text-secondary)",
            }}
          >
            <span>{stepDef.icon}</span>
            {goalContent}
            <button
              onClick={skipTutorial}
              className="ml-1 shrink-0 cursor-pointer opacity-40 transition-opacity hover:opacity-100"
              style={{ color: "var(--text-muted)", fontSize: 10 }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
