"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type TabId = "junkyard" | "garage" | "race" | "locker" | "workshop" | "shop" | "settings" | "dev";

interface TutorialStepDef {
  icon: string;
  tip: string;
  allowedTabs: TabId[] | null;
  highlightTab?: TabId;
  target?: string;
  hasGoal?: boolean;
  /** Shown as a dismissible explanation card before the goal badge appears. */
  goalIntro?: string;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const PUSH_MOWER_ENGINES = new Set(["engine_small", "engine_lawn"]);
const PUSH_MOWER_WHEELS = new Set(["wheel_busted", "wheel_basic"]);

export const STEPS: TutorialStepDef[] = [
  /* 0  */ { icon: "\u{1F3CE}\uFE0F", tip: "", allowedTabs: null },
  /* 1  */ { icon: "\u{1F5D1}\uFE0F", tip: "Click **Scavenge** to search the curb for parts.", allowedTabs: ["junkyard"], target: "scavenge-btn" },
  /* 2  */ { icon: "\u{1F9F0}", tip: "Scavenge and sell extras. You need an **engine**, a **wheel**, and **$10** to build.", allowedTabs: ["junkyard"], target: "scavenge-btn", hasGoal: true },
  /* 3  */ { icon: "\u{1F449}", tip: "You\u2019ve got parts and cash. Head to the **Garage** tab.", allowedTabs: ["junkyard", "garage"], highlightTab: "garage" },
  /* 4  */ { icon: "\u{1F6E0}\uFE0F", tip: "Pick the **Push Mower** blueprint.", allowedTabs: ["garage", "junkyard"], target: "blueprint-btn" },
  /* 5  */ { icon: "\u{1F9F0}", tip: "Slot your **engine** and **wheel** into the part slots.", allowedTabs: ["garage", "junkyard"], target: "part-slots" },
  /* 6  */ { icon: "\u{1F528}", tip: "Everything\u2019s loaded \u2014 hit **Build**!", allowedTabs: ["garage", "junkyard"], target: "build-btn" },
  /* 7  */ { icon: "\u2B50", tip: "**Activate** your mower to set it as your racer.", allowedTabs: ["garage"], target: "activate-btn" },
  /* 8  */ { icon: "\u{1F449}", tip: "Time to race! Head to the **Race** tab.", allowedTabs: ["garage", "race"], highlightTab: "race" },
  /* 9  */ { icon: "\u{1F3C1}", tip: "Enter the **Backyard Derby** \u2014 held in Clyde\u2019s back forty.", allowedTabs: ["race"], target: "race-btn" },
  /* 10 */ { icon: "\u{1F527}", tip: "Racing wears out your ride. **Repair** it in the Garage \u2014 or scavenge parts and build a new one if repairs cost too much.", allowedTabs: ["race", "junkyard", "garage"], target: "repair-btn", highlightTab: "garage" },
  /* 11 */ { icon: "\u{1F680}", tip: "Race, repair, and scavenge your way to **$500 lifetime scrap** and **25 Rep**.", allowedTabs: ["race", "junkyard", "garage"], hasGoal: true, goalIntro: "Every race earns **Scrap Bucks** and **Rep**, but also builds **Fatigue** (shown in the top bar). Fatigue cuts your performance, raises repair costs, and worsens scavenge luck. When it gets too high, a **Scrap Reset** in the Shop wipes it clean and gives permanent bonuses." },
  /* 12 */ { icon: "\u{1F449}", tip: "You\u2019re ready for a fresh start. Head to the **Shop** tab.", allowedTabs: ["race", "junkyard", "garage", "shop"], highlightTab: "shop" },
  /* 13 */ { icon: "\u{1F510}", tip: "Hit **Scrap Reset** to prestige. You\u2019ll restart stronger with permanent bonuses.", allowedTabs: ["shop"], target: "prestige-btn" },
];

const TOTAL_GUIDED_STEPS = STEPS.length - 1;

export function getAllowedTabs(step: number): Set<TabId> | null {
  if (step < 0 || step >= STEPS.length) return null;
  const allowed = STEPS[step].allowedTabs;
  return allowed ? new Set(allowed) : null;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/** Shared card surface style — unified across all tutorial modals */
const CARD_BG: React.CSSProperties = {
  background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
  boxShadow:
    "0 0 48px rgba(234, 179, 8, 0.22), 0 0 0 1px rgba(255,255,255,0.06), 0 20px 40px -8px rgba(0,0,0,0.5)",
};

const BADGE_BG: React.CSSProperties = {
  background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
  boxShadow:
    "0 0 32px rgba(234, 179, 8, 0.18), 0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px -4px rgba(0,0,0,0.4)",
};

function renderTip(tip: string) {
  return tip.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "var(--accent)" }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-colors"
          style={{
            width: i + 1 === current ? 8 : 5,
            height: 5,
            borderRadius: i + 1 === current ? 3 : "50%",
            background: i + 1 === current ? "var(--accent)" : "#444",
          }}
        />
      ))}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────────── */

interface Props { activeTab: TabId; }

export default function TutorialOverlay({ activeTab }: Props) {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);

  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const raceHistory = useGameStore((s) => s.raceHistory);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const pendingBuildVehicleId = useGameStore((s) => s.pendingBuildVehicleId);
  const pendingBuildParts = useGameStore((s) => s.pendingBuildParts);

  const [cardDismissed, setCardDismissed] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [blockerRects, setBlockerRects] = useState<{ rect: DOMRect; idx: number }[]>([]);
  const rafRef = useRef<number>(0);

  const stepDef = tutorialStep >= 0 && tutorialStep < STEPS.length ? STEPS[tutorialStep] : null;

  useEffect(() => { setCardDismissed(false); }, [tutorialStep]);

  /* ── Auto-advance ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (tutorialStep < 0) return;
    let shouldAdvance = false;
    switch (tutorialStep) {
      case 1: shouldAdvance = inventory.length > 0; break;
      case 2: {
        const hasE = inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
        const hasW = inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
        shouldAdvance = hasE && hasW && scrapBucks >= 10;
        break;
      }
      case 3: shouldAdvance = activeTab === "garage"; break;
      case 4: shouldAdvance = pendingBuildVehicleId !== null; break;
      case 5: {
        const filled = Object.values(pendingBuildParts).filter(Boolean).length;
        shouldAdvance = filled >= 2;
        break;
      }
      case 6: shouldAdvance = garage.length > 0; break;
      case 7: shouldAdvance = activeVehicleId !== null; break;
      case 8: shouldAdvance = activeTab === "race"; break;
      case 9: shouldAdvance = raceHistory.length > 0; break;
      case 10: {
        const active = garage.find((v) => v.id === activeVehicleId);
        shouldAdvance = active ? (active.condition ?? 100) >= 100 : garage.length > 1;
        break;
      }
      case 11: shouldAdvance = repPoints >= 25 && lifetimeScrapBucks >= 500; break;
      case 12: shouldAdvance = activeTab === "shop"; break;
      case 13: shouldAdvance = prestigeCount > 0; break;
    }
    if (shouldAdvance) advanceTutorial();
  }, [tutorialStep, inventory, garage, activeVehicleId, raceHistory, repPoints, lifetimeScrapBucks, scrapBucks, prestigeCount, activeTab, advanceTutorial, pendingBuildVehicleId, pendingBuildParts]);

  useEffect(() => {
    if (tutorialStep >= STEPS.length) {
      useGameStore.setState((s) => ({
        tutorialStep: -1,
        unlockEvents: [...s.unlockEvents, "Tutorial complete! The world is yours now."],
      }));
    }
  }, [tutorialStep]);

  /* Auto-dismiss tip card for step 2 once they start scavenging — shows goal badge */
  useEffect(() => {
    if (tutorialStep === 2 && !cardDismissed && inventory.length > 0) {
      setCardDismissed(true);
    }
  }, [tutorialStep, cardDismissed, inventory.length]);

  /* ── Position tracking ───────────────────────────────────────────────── */
  const updatePositions = useCallback(() => {
    if (!stepDef) { setTargetRect(null); setHighlightRect(null); setBlockerRects([]); return; }

    // Always track target for halo (even during goal badge mode)
    if (stepDef.target) {
      const el = document.querySelector(`[data-tutorial="${stepDef.target}"]`);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    } else {
      setTargetRect(null);
    }

    const nav = document.querySelector("nav");
    if (!nav) { setHighlightRect(null); setBlockerRects([]); return; }

    const tabLabels: TabId[] = ["junkyard", "garage", "race", "locker", "workshop", "shop", "settings", "dev"];
    const buttons = Array.from(nav.querySelectorAll("button")) as HTMLButtonElement[];
    const tabButtons = buttons.filter((btn) => {
      const text = btn.textContent?.toLowerCase().trim() ?? "";
      return tabLabels.some((l) => text.includes(l));
    });

    const allowedSet = stepDef.allowedTabs ? new Set(stepDef.allowedTabs) : null;

    if (stepDef.highlightTab) {
      const t = tabButtons.find((btn) => btn.textContent?.toLowerCase().trim().includes(stepDef.highlightTab!));
      setHighlightRect(t ? t.getBoundingClientRect() : null);
    } else {
      setHighlightRect(null);
    }

    if (allowedSet) {
      const blocked: { rect: DOMRect; idx: number }[] = [];
      tabButtons.forEach((btn, idx) => {
        const text = btn.textContent?.toLowerCase().trim() ?? "";
        const tabId = tabLabels.find((l) => text.includes(l));
        if (tabId && !allowedSet.has(tabId as TabId)) blocked.push({ rect: btn.getBoundingClientRect(), idx });
      });
      setBlockerRects(blocked);
    } else {
      setBlockerRects([]);
    }
  }, [stepDef]);

  useEffect(() => {
    if (tutorialStep < 0) return;
    const update = () => { updatePositions(); rafRef.current = requestAnimationFrame(update); };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tutorialStep, updatePositions]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (tutorialStep < 0 || !stepDef) return null;

  /* Step 0: Intro card */
  if (tutorialStep === 0) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
        <div
          className="animate-fade-up mx-4 w-full max-w-sm rounded-2xl p-6"
          style={CARD_BG}
        >
          <div className="mb-4 text-center text-5xl">{"\u{1F3CE}\uFE0F"}</div>
          <h2 className="mb-1 text-center text-lg font-bold tracking-tight" style={{ color: "var(--text-heading)" }}>Rags to Races</h2>
          <div className="mx-auto mb-4 h-0.5 w-12 rounded-full" style={{ background: "var(--accent)" }} />
          <p className="mb-3 text-center text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            You&apos;ve got nothing but the clothes on your back and a curb full of someone else&apos;s trash.
            Time to turn that garbage into glory.
          </p>
          <p className="mb-5 text-center text-xs italic" style={{ color: "var(--text-muted)" }}>Scavenge parts. Build a ride. Race your way to the top.</p>
          <div className="mb-4 flex justify-center">
            <StepDots current={0} total={TOTAL_GUIDED_STEPS} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={skipTutorial} className="cursor-pointer text-xs opacity-50 transition-opacity hover:opacity-100" style={{ color: "var(--text-muted)" }}>Skip tutorial</button>
            <button onClick={advanceTutorial} className="cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-colors" style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}>Let&apos;s Go</button>
          </div>
        </div>
      </div>
    );
  }

  /* Steps 1+: Guided */
  const isGoalStep = !!stepDef.hasGoal;
  const showGoalIntro = isGoalStep && !cardDismissed && !!stepDef.goalIntro;
  const showCard = !cardDismissed && stepDef.tip && !showGoalIntro;
  const showGoal = cardDismissed && isGoalStep;

  // Pick an anchor rect — prefer target, fall back to highlighted tab
  const anchorRect = targetRect ?? highlightRect;

  // Card position near anchor
  let cardStyle: React.CSSProperties = {};
  let arrowClass = "";
  let arrowLeftPx = 0;
  if ((showCard || showGoalIntro) && anchorRect) {
    const viewW = typeof window !== "undefined" ? window.innerWidth : 800;
    const viewH = typeof window !== "undefined" ? window.innerHeight : 600;
    const cardW = Math.min(340, viewW - 32);
    const cardH = showGoalIntro ? 160 : 100;
    const roomBelow = viewH - anchorRect.bottom - 16;
    const above = roomBelow < cardH && anchorRect.top > cardH + 16;
    const left = Math.max(16, Math.min(anchorRect.left + anchorRect.width / 2 - cardW / 2, viewW - cardW - 16));
    const top = above ? anchorRect.top - 16 : anchorRect.bottom + 16;
    arrowClass = above ? "tutorial-arrow-down" : "tutorial-arrow-up";
    arrowLeftPx = Math.max(20, Math.min(anchorRect.left + anchorRect.width / 2 - left, cardW - 20));
    cardStyle = {
      position: "fixed",
      left,
      top: above ? undefined : top,
      bottom: above ? viewH - top : undefined,
      width: cardW,
      zIndex: 10000,
    };
  } else if (showCard || showGoalIntro) {
    cardStyle = {
      position: "fixed",
      bottom: 72,
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(340px, calc(100% - 2rem))",
      zIndex: 10000,
    };
  }

  // Goal badge content
  let goalContent: React.ReactNode = null;
  if (showGoal) {
    if (tutorialStep === 2) {
      const hasE = inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
      const hasW = inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
      goalContent = (
        <>
          <span style={{ color: hasE ? "var(--success, #4ade80)" : "var(--danger, #f87171)" }}>Engine {hasE ? "\u2713" : "\u2717"}</span>
          <span style={{ color: "var(--text-muted)" }}>{"\u00B7"}</span>
          <span style={{ color: hasW ? "var(--success, #4ade80)" : "var(--danger, #f87171)" }}>Wheel {hasW ? "\u2713" : "\u2717"}</span>
          <span style={{ color: "var(--text-muted)" }}>{"\u00B7"}</span>
          <span style={{ color: scrapBucks >= 10 ? "var(--success, #4ade80)" : "var(--text-primary)" }}>
            ${formatNumber(scrapBucks)} / $10
          </span>
        </>
      );
    } else if (tutorialStep === 11) {
      goalContent = (
        <>
          <span>${formatNumber(lifetimeScrapBucks)} <span style={{ color: "var(--text-muted)" }}>/</span> $500</span>
          <span style={{ color: "var(--text-muted)" }}>{"\u00B7"}</span>
          <span>{formatNumber(repPoints)} <span style={{ color: "var(--text-muted)" }}>/</span> 25 Rep</span>
        </>
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
            left: rect.left, top: rect.top, width: rect.width, height: rect.height,
            background: "rgba(0,0,0,0.5)", cursor: "not-allowed", pointerEvents: "auto",
          }}
        />
      ))}

      {/* Highlight pulse on target tab */}
      {highlightRect && (
        <div
          className="tutorial-pulse fixed z-[9997] rounded"
          style={{
            left: highlightRect.left - 4, top: highlightRect.top - 4,
            width: highlightRect.width + 8, height: highlightRect.height + 8,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Pulsing halo on target button (in-panel elements) */}
      {targetRect && (
        <div
          className="tutorial-pulse fixed z-[9999] rounded-lg"
          style={{
            left: targetRect.left - 5, top: targetRect.top - 5,
            width: targetRect.width + 10, height: targetRect.height + 10,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Goal intro card — dismissible explanation before goal badge */}
      {showGoalIntro && (
        <div style={cardStyle}>
          <div
            className={`animate-fade-up relative rounded-2xl p-3 ${arrowClass}`}
            style={{
              ...CARD_BG,
              ["--arrow-left" as string]: `${arrowLeftPx}px`,
            }}
          >
            <button
              onClick={skipTutorial}
              className="absolute top-2 right-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
              style={{ color: "#888", background: "#333" }}
            >
              {"\u2715"}
            </button>

            <div className="flex items-start gap-2.5 pr-5">
              <span className="mt-0.5 shrink-0 text-lg">{stepDef.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {renderTip(stepDef.goalIntro!)}
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <StepDots current={tutorialStep} total={TOTAL_GUIDED_STEPS} />
                  <button
                    onClick={() => setCardDismissed(true)}
                    className="cursor-pointer rounded px-3 py-1 text-xs font-semibold transition-colors"
                    style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Positioned tutorial card (non-goal steps) */}
      {showCard && (
        <div style={cardStyle}>
          <div
            className={`animate-fade-up relative rounded-2xl p-3 ${arrowClass}`}
            style={{
              ...CARD_BG,
              ["--arrow-left" as string]: `${arrowLeftPx}px`,
            }}
          >
            <button
              onClick={skipTutorial}
              className="absolute top-2 right-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
              style={{ color: "#888", background: "#333" }}
            >
              {"\u2715"}
            </button>

            <div className="flex items-start gap-2.5 pr-5">
              <span className="mt-0.5 shrink-0 text-lg">{stepDef.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {renderTip(stepDef.tip)}
                </p>
                <div className="mt-2">
                  <StepDots current={tutorialStep} total={TOTAL_GUIDED_STEPS} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal badge */}
      {showGoal && goalContent && (
        <div className="fixed top-2 left-1/2 z-[10000] -translate-x-1/2 sm:top-16">
          <div
            className="animate-fade-up flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium"
            style={{
              ...BADGE_BG,
              color: "var(--text-primary)",
            }}
          >
            <span className="text-sm">{stepDef.icon}</span>
            {goalContent}
            <div className="ml-1">
              <StepDots current={tutorialStep} total={TOTAL_GUIDED_STEPS} />
            </div>
            <button
              onClick={skipTutorial}
              className="ml-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
              style={{ color: "#888", background: "#333", fontSize: 9 }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
