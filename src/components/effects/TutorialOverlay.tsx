"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useGameStore } from "@/state/store";
import { getPartById, CONDITION_MULTIPLIERS } from "@/data/parts";
import { formatNumber } from "@/utils/format";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type TabId = "junkyard" | "garage" | "race" | "gear" | "upgrades" | "help" | "log" | "settings" | "dev";

interface TutorialStepDef {
  icon: string;
  tip: string;
  allowedTabs: TabId[] | null;
  highlightTab?: TabId;
  target?: string;
  hasGoal?: boolean;
  /** Shown as a dismissible explanation card before the goal badge appears. */
  goalIntro?: string;
  /** Multi-card sequence replacing goalIntro — shows cards one at a time. */
  goalIntroSequence?: string[];
  /** Player clicks "Got it" to advance — no auto-advance. */
  dismissable?: boolean;
  /** Hide the entire overlay while a race is running. */
  hideDuringRace?: boolean;
  /** Extra detail shown in a modal when the player taps the ? button. */
  helpDetail?: string;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const SHOW_DEV = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

const PUSH_MOWER_ENGINES = new Set(["engine_small", "engine_lawn"]);
const PUSH_MOWER_WHEELS = new Set(["wheel_busted", "wheel_basic"]);

export const STEPS: TutorialStepDef[] = [
  /* 0  */ { icon: "\u{1F3CE}\uFE0F", tip: "", allowedTabs: null },
  /* 1  */ { icon: "\u{1F5D1}\uFE0F", tip: "Click **Scavenge** to search for parts.", allowedTabs: ["junkyard"], target: "scavenge-btn" },
  /* 2  */ { icon: "\u{1F9F0}", tip: "Collect an **engine**, a **wheel**, and **$10** to build your first ride.", allowedTabs: ["junkyard"], target: "scavenge-btn", hasGoal: true, helpDetail: "Scavenge at different locations to find parts. Each has a category (engine, wheel, misc, etc.) and a condition rating. Sell parts you don\u2019t need for Scrap Bucks. You need at least one engine, one wheel, and $10 to build your first vehicle." },
  /* 3  */ { icon: "\u{1F449}", tip: "Head to the **Garage** tab.", allowedTabs: ["junkyard", "garage"], highlightTab: "garage" },
  /* 4  */ { icon: "\u{1F6E0}\uFE0F", tip: "Pick the **Push Mower** blueprint.", allowedTabs: ["garage", "junkyard"], target: "blueprint-btn" },
  /* 5  */ { icon: "\u{1F9F0}", tip: "Equip an **engine** and a **wheel**.", allowedTabs: ["garage", "junkyard"], target: "part-slots" },
  /* 6  */ { icon: "\u{1F528}", tip: "Hit **Build**!", allowedTabs: ["garage", "junkyard"], target: "build-btn" },
  /* 7  */ { icon: "\u2B50", tip: "**Activate** your mower to race.", allowedTabs: ["garage"], target: "activate-btn" },
  /* 8  */ { icon: "\u{1F449}", tip: "Head to the **Race** tab.", allowedTabs: ["garage", "race"], highlightTab: "race" },
  /* 9  */ { icon: "\u{1F3CE}\uFE0F", tip: "**35% win** is solid for a starter. **DNF** = broke down mid-race.", allowedTabs: ["race"], target: "odds-display", dismissable: true, helpDetail: "Your win chance depends on your vehicle\u2019s performance vs. the circuit difficulty. DNF (Did Not Finish) means your vehicle broke down mid-race \u2014 higher reliability reduces this risk. Even losses earn some Scrap Bucks and Rep." },
  /* 10 */ { icon: "\u{1F3C1}", tip: "Hit **Enter Race**!", allowedTabs: ["race"], target: "race-btn" },
  /* 11 */ { icon: "\u{1F3C1}", tip: "", allowedTabs: ["race"], hideDuringRace: true },
  /* 12 */ { icon: "\u{1F3C6}", tip: "", allowedTabs: ["race"], dismissable: true },
  /* 13 */ { icon: "\u{1F527}", tip: "Your ride took damage. First **Repair** is free \u2014 head to the **Garage**.", allowedTabs: ["race", "junkyard", "garage"], target: "repair-btn", highlightTab: "garage" },
  // ── Post-first-race: teach systems during the early grind ──────────────
  /* 14 */ { icon: "\u{1F527}", tip: "Head to the **Upgrades** tab.", allowedTabs: ["race", "junkyard", "garage", "upgrades"], highlightTab: "upgrades", goalIntro: "**Workshop** upgrades boost your current run. Try **Keen Eye** ($75) for better scavenge luck or **Budget Repairs** for cheaper fixes.", helpDetail: "Workshop has categories like Scavenging, Building, Racing, and Maintenance. Upgrades reset on Scrap Reset, but the bonuses help you earn more each run." },
  /* 15 */ { icon: "\u2B06\uFE0F", tip: "**Buy** a Workshop upgrade to power up your run.", allowedTabs: ["race", "junkyard", "garage", "upgrades"], target: "workshop-upgrade-btn" },
  /* 16 */ { icon: "\u{1F45C}", tip: "Check out the **Gear** tab \u2014 equip gear for passive bonuses.", allowedTabs: ["race", "junkyard", "garage", "gear", "upgrades"], highlightTab: "gear", goalIntro: "**Gear** gives passive bonuses that **persist through Scrap Resets**. Equip what you\u2019ve found from scavenging and racing." },
  /* 17 */ { icon: "\u{1F3CE}\uFE0F", tip: "Race and scavenge to earn **$500** and **100 Rep**.", allowedTabs: ["race", "junkyard", "garage", "gear", "upgrades"], hasGoal: true, helpDetail: "Keep racing and selling spare parts. Rep unlocks new scavenging locations and circuits. Once you hit these targets, you\u2019ll be ready for the next step." },
  /* 18 */ { icon: "\u{1F528}", tip: "Build a **second vehicle** \u2014 try a better blueprint or upgrade your parts.", allowedTabs: ["race", "junkyard", "garage", "gear", "upgrades"], highlightTab: "garage", goalIntro: "Better vehicles = higher win rates = more Scrap Bucks. Scavenge for higher-quality parts and try new blueprints as they unlock." },
  /* 19 */ { icon: "\u{1F680}", tip: "Earn **$5,000 lifetime scrap** and **500 Rep**.", allowedTabs: ["race", "junkyard", "garage", "gear", "upgrades"], hasGoal: true, goalIntroSequence: ["You\u2019re getting the hang of it. Keep racing, building, and upgrading.", "**Fatigue** builds each race and cuts performance. When progress stalls, it\u2019s time to **Scrap Reset**."], helpDetail: "Lifetime scrap is the total scrap you\u2019ve ever earned (not your current balance). Rep unlocks new locations, circuits, and vehicles. Keep pushing \u2014 you\u2019re almost ready to prestige." },
  /* 20 */ { icon: "\u{1F449}", tip: "Head to **Upgrades > Prestige** \u2014 it\u2019s time to reset.", allowedTabs: ["race", "junkyard", "garage", "gear", "upgrades"], highlightTab: "upgrades" },
  /* 21 */ { icon: "\u{1F510}", tip: "Hit **Scrap Reset** to prestige. You\u2019ll restart stronger with **Legacy Points**.", allowedTabs: ["upgrades"], target: "prestige-btn" },
];

const TOTAL_GUIDED_STEPS = STEPS.length - 1;

export function getAllowedTabs(step: number): Set<TabId> | null {
  if (step < 0 || step >= STEPS.length) return null;
  const allowed = STEPS[step].allowedTabs;
  if (!allowed) return null;
  const s = new Set(allowed);
  s.add("help");
  s.add("log");
  s.add("settings");
  s.add("dev");
  return s;
}

/**
 * Adaptive tab restrictions — loosens step-based restrictions when the player
 * has already progressed past what the step assumes.
 */
export function getAdaptiveAllowedTabs(
  step: number,
  state: { garage: unknown[]; raceHistory: unknown[]; workshopLevels: Record<string, number> },
): Set<TabId> | null {
  const base = getAllowedTabs(step);
  if (!base) return null; // no restrictions (step 0 or post-tutorial)
  // Earn tabs by demonstrating progress
  if (state.garage.length > 0) base.add("garage");
  if (state.raceHistory.length > 0) base.add("race");
  if (Object.values(state.workshopLevels).some((v) => v > 0)) base.add("upgrades");
  // Gear tab is always useful once garage is available
  if (state.garage.length > 0) base.add("gear");
  return base;
}

/**
 * Check if a given tutorial step's auto-advance condition is already satisfied.
 * Used for batch-skipping when the player is ahead of the tutorial.
 */
function isStepConditionMet(
  step: number,
  state: {
    inventory: { definitionId: string }[];
    garage: { id: string; condition?: number }[];
    activeVehicleId: string | null;
    raceHistory: unknown[];
    repPoints: number;
    lifetimeScrapBucks: number;
    scrapBucks: number;
    prestigeCount: number;
    activeTab: string;
    pendingBuildVehicleId: string | null;
    pendingBuildParts: Record<string, unknown>;
    isRacing: boolean;
    workshopLevels: Record<string, number>;
  },
): boolean {
  switch (step) {
    case 1: return state.inventory.length > 0;
    case 2: {
      const hasE = state.inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
      const hasW = state.inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
      return hasE && hasW && state.scrapBucks >= 10;
    }
    case 3: return state.activeTab === "garage";
    case 4: return state.pendingBuildVehicleId !== null;
    case 5: return Object.values(state.pendingBuildParts).filter(Boolean).length >= 2;
    case 6: return state.garage.length > 0;
    case 7: return state.activeVehicleId !== null;
    case 8: return state.activeTab === "race";
    case 9: return state.isRacing;
    case 10: return state.isRacing;
    case 11: return state.raceHistory.length > 0;
    case 13: {
      const active = state.garage.find((v) => v.id === state.activeVehicleId);
      return active ? (active.condition ?? 100) >= 100 : state.garage.length > 1;
    }
    // Post-first-race: teach systems during the early grind
    case 14: return state.activeTab === "upgrades";
    case 15: return Object.values(state.workshopLevels).some((v) => v > 0);
    case 16: return state.activeTab === "gear";
    case 17: return state.repPoints >= 100 && state.lifetimeScrapBucks >= 500;
    case 18: return state.garage.length >= 2;
    case 19: return state.repPoints >= 500 && state.lifetimeScrapBucks >= 5000;
    case 20: return state.activeTab === "upgrades";
    case 21: return state.prestigeCount > 0;
    default: return false; // step 0, 12 (dismissable) — never auto-skip
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/** Shared card surface style — unified across all tutorial modals */
const CARD_BG: React.CSSProperties = {
  background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
  boxShadow:
    "0 0 48px color-mix(in srgb, var(--accent, #eab308) 22%, transparent), 0 0 0 1px rgba(255,255,255,0.06), 0 20px 40px -8px rgba(0,0,0,0.5)",
};

const BADGE_BG: React.CSSProperties = {
  background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
  boxShadow:
    "0 0 32px color-mix(in srgb, var(--accent, #eab308) 18%, transparent), 0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px -4px rgba(0,0,0,0.4)",
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
      {Array.from({ length: total }, (_, i) => {
        const active = i + 1 === current;
        const past = i + 1 < current;
        return (
          <div
            key={i}
            className="rounded-full transition-colors"
            style={{
              width: active ? 10 : 5,
              height: 5,
              borderRadius: active ? 3 : "50%",
              background: active ? "#fff" : past ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────────── */

interface Props { activeTab: TabId; }

export default function TutorialOverlay({ activeTab }: Props) {
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const advanceTutorial = useGameStore((s) => s.advanceTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);
  const devQuickStart = useGameStore((s) => s.devQuickStart);
  const dismissTutorial = useGameStore((s) => s.dismissTutorial);
  const tutorialDismissed = useGameStore((s) => s.tutorialDismissed);
  const tutorialMinimized = useGameStore((s) => s.tutorialMinimized);
  const toggleTutorialMinimized = useGameStore((s) => s.toggleTutorialMinimized);

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
  const isRacing = useGameStore((s) => s.isRacing);
  const lastRaceOutcome = useGameStore((s) => s.lastRaceOutcome);
  const workshopLevels = useGameStore((s) => s.workshopLevels);

  const tutorialLastAdvanceTime = useGameStore((s) => s.tutorialLastAdvanceTime);

  const [cardDismissed, setCardDismissed] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [sellBtnRect, setSellBtnRect] = useState<DOMRect | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect[] | null>(null);
  const [blockerRects, setBlockerRects] = useState<{ rect: DOMRect; idx: number }[]>([]);
  const [hintRects, setHintRects] = useState<DOMRect[]>([]);
  const [showHelpNudge, setShowHelpNudge] = useState(false);
  const rafRef = useRef<number>(0);
  const helpNudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepDef = tutorialStep >= 0 && tutorialStep < STEPS.length ? STEPS[tutorialStep] : null;

  const [introSubStep, setIntroSubStep] = useState(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on step change
  useEffect(() => { setCardDismissed(false); setIntroSubStep(0); setShowHelpModal(false); }, [tutorialStep]);

  /* ── "Need help?" nudge — shows after idle period ───────────────────── */
  useEffect(() => {
    if (tutorialStep <= 0 || tutorialStep < 0) return;
    if (helpNudgeTimerRef.current) clearTimeout(helpNudgeTimerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hide on step change
    setShowHelpNudge(false);
    const nudgeDelay = (tutorialStep === 17 || tutorialStep === 19) ? 30000 : 60000;
    helpNudgeTimerRef.current = setTimeout(() => {
      setShowHelpNudge(true);
      // Auto-hide after 8 seconds
      setTimeout(() => setShowHelpNudge(false), 8000);
    }, nudgeDelay);
    return () => { if (helpNudgeTimerRef.current) clearTimeout(helpNudgeTimerRef.current); };
  }, [tutorialStep, tutorialLastAdvanceTime]);

  /* ── Auto-advance with adaptive batch-skip ───────────────────────────── */
  useEffect(() => {
    if (tutorialStep < 0) return;
    const stateSnapshot = {
      inventory, garage, activeVehicleId, raceHistory, repPoints,
      lifetimeScrapBucks, scrapBucks, prestigeCount, activeTab,
      pendingBuildVehicleId, pendingBuildParts, isRacing, workshopLevels,
    };
    if (!isStepConditionMet(tutorialStep, stateSnapshot)) return;

    // Batch-skip: advance through consecutive steps whose conditions are already met
    // Cap at 5 to prevent infinite loops (dismissable steps like 12 will stop the chain)
    const skipped: number[] = [];
    let nextStep = tutorialStep + 1;
    let skips = 0;
    while (nextStep < STEPS.length && skips < 5) {
      if (!isStepConditionMet(nextStep, stateSnapshot)) break;
      skipped.push(nextStep);
      nextStep++;
      skips++;
    }

    // Record skipped steps for analytics
    if (skipped.length > 0) {
      useGameStore.setState((s) => ({
        tutorialSkippedSteps: [...s.tutorialSkippedSteps, tutorialStep, ...skipped],
      }));
    }

    // Advance to the target step (skipping intermediate ones)
    const targetStep = tutorialStep + 1 + skips;
    useGameStore.setState({
      tutorialStep: targetStep >= STEPS.length ? -1 : targetStep,
      tutorialLastAdvanceTime: Date.now(),
    });
  }, [tutorialStep, inventory, garage, activeVehicleId, raceHistory, repPoints, lifetimeScrapBucks, scrapBucks, prestigeCount, activeTab, advanceTutorial, pendingBuildVehicleId, pendingBuildParts, isRacing, workshopLevels]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-dismiss on inventory change
      setCardDismissed(true);
    }
  }, [tutorialStep, cardDismissed, inventory.length]);

  /* ── Step 2: redirect halo to sell area when ready to sell ─────────── */
  const step2SellReady = useMemo(() => {
    if (tutorialStep !== 2 || scrapBucks >= 10) return false;
    const hasE = inventory.some((p) => PUSH_MOWER_ENGINES.has(p.definitionId));
    const hasW = inventory.some((p) => PUSH_MOWER_WHEELS.has(p.definitionId));
    if (!hasE || !hasW) return false;
    // Only count misc items — that's what "Sell Scrap" actually sells
    let miscValue = 0;
    for (const p of inventory) {
      if (p.type !== "part") continue;
      const def = getPartById(p.definitionId);
      if (!def || def.category !== "misc") continue;
      miscValue += Math.floor(def.scrapValue * (CONDITION_MULTIPLIERS[p.condition] ?? 1));
    }
    return scrapBucks + miscValue >= 10;
  }, [tutorialStep, inventory, scrapBucks]);

  /* ── Position tracking ───────────────────────────────────────────────── */
  const effectiveTarget = stepDef?.target
    ? (tutorialStep === 2 && step2SellReady ? "sell-area" : stepDef.target)
    : undefined;

  const updatePositions = useCallback(() => {
    if (!stepDef) { setTargetRect(null); setSellBtnRect(null); setHighlightRect(null); setBlockerRects([]); setHintRects([]); return; }

    // Always track target for halo (even during goal badge mode)
    if (effectiveTarget) {
      const el = document.querySelector(`[data-tutorial="${effectiveTarget}"]`);
      const r = el ? el.getBoundingClientRect() : null;
      // Skip zero-size rects (element hidden or off-screen)
      setTargetRect(r && r.width > 0 && r.height > 0 ? r : null);
    } else {
      setTargetRect(null);
    }

    // Per-element hint highlights (e.g. individual part buttons on step 5)
    // Only glow parts in unfilled slots — once a slot has a part, stop pulsing all buttons in that slot
    if (tutorialStep === 5) {
      const unfilledSlots = document.querySelectorAll('[data-tutorial-slot]:not([data-tutorial-slot-filled])');
      const btns: Element[] = [];
      unfilledSlots.forEach((slot) => {
        btns.push(...Array.from(slot.querySelectorAll('[data-tutorial="part-btn"]')));
      });
      setHintRects(btns.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0));
    } else {
      setHintRects([]);
    }

    // Secondary halo on Sell Scrap button when sell nudge is active
    if (step2SellReady) {
      const btn = document.querySelector('[data-tutorial="sell-scrap-btn"]');
      const r = btn ? btn.getBoundingClientRect() : null;
      setSellBtnRect(r && r.width > 0 && r.height > 0 ? r : null);
    } else {
      setSellBtnRect(null);
    }

    // Collect tab buttons from ALL navs (sidebar nav + content nav + mobile nav)
    const tabLabels: TabId[] = ["junkyard", "garage", "race", "gear", "upgrades", "settings", "dev"];
    const allNavs = document.querySelectorAll("nav");
    const allSidebarBtns = document.querySelectorAll(".desktop-sidebar button");
    const navButtons: HTMLButtonElement[] = [];
    allNavs.forEach((nav) => {
      navButtons.push(...(Array.from(nav.querySelectorAll("button")) as HTMLButtonElement[]));
    });
    // Also include sidebar buttons (sidebar uses <aside> not <nav> wrapper at top level)
    allSidebarBtns.forEach((btn) => {
      if (!navButtons.includes(btn as HTMLButtonElement)) navButtons.push(btn as HTMLButtonElement);
    });
    if (navButtons.length === 0) { setHighlightRect(null); setBlockerRects([]); return; }

    const tabButtons = navButtons.filter((btn) => {
      const text = btn.textContent?.toLowerCase().trim() ?? "";
      return tabLabels.some((l) => text.includes(l));
    });

    const allowedSet = stepDef.allowedTabs ? new Set(stepDef.allowedTabs) : null;

    if (stepDef.highlightTab) {
      // Prefer exact matching via data-tutorial-tab attribute (robust to abbreviated labels)
      const attrMatches = Array.from(
        document.querySelectorAll(`[data-tutorial-tab="${stepDef.highlightTab}"]`),
      ) as HTMLElement[];
      let rects = attrMatches
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      // Fall back to text-based matching if no elements have the attribute yet
      if (rects.length === 0) {
        const textMatches = tabButtons.filter((btn) =>
          btn.textContent?.toLowerCase().trim().includes(stepDef.highlightTab!),
        );
        rects = textMatches
          .map((m) => m.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0);
      }
      if (rects.length > 0) {
        setHighlightRect(rects);
      } else {
        // Last resort: the mobile "More" overflow button
        const moreBtn = document.querySelector('[data-tutorial="mobile-more"]');
        const hr = moreBtn ? moreBtn.getBoundingClientRect() : null;
        setHighlightRect(hr && hr.width > 0 && hr.height > 0 ? [hr] : null);
      }
    } else {
      setHighlightRect(null);
    }

    if (allowedSet) {
      const blocked: { rect: DOMRect; idx: number }[] = [];
      // Collect every button with a data-tutorial-tab attribute (both navs)
      const attrButtons = Array.from(
        document.querySelectorAll<HTMLElement>("[data-tutorial-tab]"),
      );
      attrButtons.forEach((btn, idx) => {
        const tabId = btn.getAttribute("data-tutorial-tab") as TabId | null;
        if (!tabId || tabId === "dev") return;
        const r = btn.getBoundingClientRect();
        if (!allowedSet.has(tabId) && r.width > 0 && r.height > 0) {
          blocked.push({ rect: r, idx });
        }
      });
      // Fall back to text-based matching if nothing had attributes
      if (attrButtons.length === 0) {
        tabButtons.forEach((btn, idx) => {
          const text = btn.textContent?.toLowerCase().trim() ?? "";
          const tabId = tabLabels.find((l) => text.includes(l));
          const r = btn.getBoundingClientRect();
          if (tabId && tabId !== "dev" && !allowedSet.has(tabId as TabId) && r.width > 0 && r.height > 0) {
            blocked.push({ rect: r, idx });
          }
        });
      }
      setBlockerRects(blocked);
    } else {
      setBlockerRects([]);
    }
  }, [stepDef, effectiveTarget, step2SellReady, tutorialStep]);

  useEffect(() => {
    if (tutorialStep < 0) return;
    const update = () => { updatePositions(); rafRef.current = requestAnimationFrame(update); };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tutorialStep, updatePositions]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (tutorialStep < 0 || !stepDef) return null;

  /* Hide overlay during live race animation */
  if (stepDef.hideDuringRace && isRacing) return null;

  /* Dynamic tip for step 12: react to race result */
  let effectiveTip = stepDef.tip;
  if (tutorialStep === 12 && lastRaceOutcome) {
    if (lastRaceOutcome.result === "win") {
      effectiveTip = "You won! From the curb to the podium \u2014 that\u2019s how legends start. You earned **Scrap Bucks** and **Rep** \u2014 Rep unlocks new locations and gear.";
    } else if (lastRaceOutcome.result === "dnf") {
      effectiveTip = "Your mower exploded. Classic. **Repair** it and try again \u2014 that\u2019s racing! Even losses earn a little **Rep** \u2014 it unlocks new locations and gear.";
    } else {
      effectiveTip = "Not first, but you finished and earned cash. **Keep racing** \u2014 the mower believes in you. You\u2019re also earning **Rep** \u2014 it unlocks new locations and gear.";
    }
  }
  /* Dynamic tip for step 15: if player can't afford the cheapest upgrade ($75 Keen Eye), redirect them back to racing */
  const WORKSHOP_AFFORD_THRESHOLD = 75;
  if (tutorialStep === 15 && scrapBucks < WORKSHOP_AFFORD_THRESHOLD) {
    effectiveTip = `You need **$${WORKSHOP_AFFORD_THRESHOLD}** for **Keen Eye**. Head to **Race** and earn more scrap, then come back.`;
  }
  /* Step 11 has no tip (hidden during race) — skip to avoid empty card */

  /* Step 0: Intro card */
  if (tutorialStep === 0) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
        <div
          className="animate-fade-up mx-4 w-full max-w-sm rounded-2xl p-6"
          style={CARD_BG}
        >
          <button
            onClick={dismissTutorial}
            className="absolute top-3 right-3 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
            style={{ color: "#888", background: "#333" }}
          >
            {"\u2715"}
          </button>
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
            <button onClick={skipTutorial} className="shrink-0 cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold opacity-80 transition-opacity hover:opacity-100" style={{ color: "var(--text-secondary)", borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }}>Jump in</button>
            <button onClick={advanceTutorial} className="shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-bold tracking-wide transition-colors" style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", boxShadow: "0 0 16px color-mix(in srgb, var(--accent, #eab308) 30%, transparent)" }}>Guide me &rarr;</button>
          </div>
          {SHOW_DEV && (
            <button
              onClick={() => { devQuickStart(); skipTutorial(); }}
              className="mt-3 w-full cursor-pointer rounded-md border border-dashed px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--text-muted)", color: "var(--text-muted)", background: "transparent" }}
            >
              Dev Jumpstart — skip to race-ready
            </button>
          )}
        </div>
      </div>
    );
  }

  /* Dismissed mode: render only halos/highlights, no cards or blockers */
  if (tutorialDismissed) {
    // If the target element isn't visible (wrong tab), pulse the first allowed tab as a fallback
    const fallbackTabRect = !targetRect && !highlightRect && stepDef.allowedTabs?.[0]
      ? (() => {
          const fallbackTab = stepDef.allowedTabs![0];
          // Prefer exact match via data-tutorial-tab attribute
          const attrBtn = document.querySelector<HTMLElement>(`[data-tutorial-tab="${fallbackTab}"]`);
          if (attrBtn) {
            const r = attrBtn.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return r;
          }
          const nav = document.querySelector("nav");
          if (!nav) return null;
          const tabLabels: TabId[] = ["junkyard", "garage", "race", "gear", "upgrades", "settings", "dev"];
          const buttons = Array.from(nav.querySelectorAll("button")) as HTMLButtonElement[];
          const btn = buttons.find((b) => {
            const text = b.textContent?.toLowerCase().trim() ?? "";
            return tabLabels.some((l) => l === fallbackTab && text.includes(l));
          });
          return btn ? btn.getBoundingClientRect() : null;
        })()
      : null;

    return (
      <>
        {highlightRect?.map((rect, i) => (
          <div
            key={`hl-d-${i}`}
            className="tutorial-pulse fixed z-[9997] rounded"
            style={{
              left: rect.left - 4, top: rect.top - 4,
              width: rect.width + 8, height: rect.height + 8,
              pointerEvents: "none",
            }}
          />
        ))}
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
        {fallbackTabRect && (
          <div
            className="tutorial-pulse fixed z-[9997] rounded"
            style={{
              left: fallbackTabRect.left - 4, top: fallbackTabRect.top - 4,
              width: fallbackTabRect.width + 8, height: fallbackTabRect.height + 8,
              pointerEvents: "none",
            }}
          />
        )}
      </>
    );
  }

  /* Steps 1+: Guided */
  const isGoalStep = !!stepDef.hasGoal;
  const hasIntro = !!stepDef.goalIntro || !!stepDef.goalIntroSequence;
  const introSequence = stepDef.goalIntroSequence;
  const currentIntroText = introSequence ? introSequence[introSubStep] : stepDef.goalIntro;
  const introSequenceComplete = introSequence ? introSubStep >= introSequence.length - 1 : true;
  const showGoalIntro = !cardDismissed && hasIntro && !tutorialMinimized;
  const showCard = (hasIntro ? (cardDismissed && !isGoalStep && !!effectiveTip) : (!cardDismissed && !!effectiveTip)) && !tutorialMinimized;
  const showGoal = cardDismissed && isGoalStep && !tutorialMinimized;
  // Show restore chip when tutorial is minimized AND there's something to restore (card or goal)
  const showMinimizedChip = tutorialMinimized && (
    (hasIntro && !cardDismissed) ||
    (!!effectiveTip && (!hasIntro || cardDismissed) && !isGoalStep) ||
    (isGoalStep && cardDismissed)
  );

  // Pick an anchor rect — prefer target, fall back to first highlighted tab
  const anchorRect = targetRect ?? (highlightRect ? highlightRect[0] : null);

  // Card position near anchor
  let cardStyle: React.CSSProperties = {};
  let arrowClass = "";
  let arrowLeftPx = 0;
  if ((showCard || showGoalIntro) && anchorRect) {
    const viewW = typeof window !== "undefined" ? window.innerWidth : 800;
    const viewH = typeof window !== "undefined" ? window.innerHeight : 600;
    const cardW = Math.min(340, viewW - 32);
    const cardH = showGoalIntro ? 160 : 100;
    // Detect if anchor is in the sidebar (left edge < 220px on wide screens)
    const inSidebar = anchorRect.left < 220 && viewW >= 640;
    let left: number;
    let top: number;
    if (inSidebar) {
      // Position to the right of the sidebar, vertically centered on the anchor
      left = Math.max(220, anchorRect.right + 12);
      top = Math.max(16, anchorRect.top + anchorRect.height / 2 - cardH / 2);
      arrowClass = "";
    } else {
      const roomBelow = viewH - anchorRect.bottom - 16;
      const above = roomBelow < cardH && anchorRect.top > cardH + 16;
      left = Math.max(16, Math.min(anchorRect.left + anchorRect.width / 2 - cardW / 2, viewW - cardW - 16));
      // When above: card's bottom sits 16px above anchor's top
      // When below: card's top sits 16px below anchor's bottom
      top = above ? anchorRect.top - cardH - 16 : anchorRect.bottom + 16;
      arrowClass = above ? "tutorial-arrow-down" : "tutorial-arrow-up";
    }
    arrowLeftPx = inSidebar ? 0 : Math.max(20, Math.min(anchorRect.left + anchorRect.width / 2 - left, cardW - 20));
    cardStyle = {
      position: "fixed",
      left,
      top,
      width: cardW,
      zIndex: 10000,
    };
  } else if (showCard || showGoalIntro) {
    cardStyle = {
      position: "fixed",
      bottom: 120,
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
    }
    if (tutorialStep === 17) {
      goalContent = (
        <>
          <span style={{ color: lifetimeScrapBucks >= 500 ? "var(--success, #4ade80)" : "var(--text-primary)" }}>
            ${formatNumber(lifetimeScrapBucks)} / $500
          </span>
          <span style={{ color: "var(--text-muted)" }}>{"\u00B7"}</span>
          <span style={{ color: repPoints >= 100 ? "var(--success, #4ade80)" : "var(--text-primary)" }}>
            {formatNumber(repPoints)} / 100 Rep
          </span>
        </>
      );
    }
    if (tutorialStep === 19) {
      goalContent = (
        <>
          <span style={{ color: lifetimeScrapBucks >= 5000 ? "var(--success, #4ade80)" : "var(--text-primary)" }}>
            ${formatNumber(lifetimeScrapBucks)} / $5k
          </span>
          <span style={{ color: "var(--text-muted)" }}>{"\u00B7"}</span>
          <span style={{ color: repPoints >= 500 ? "var(--success, #4ade80)" : "var(--text-primary)" }}>
            {formatNumber(repPoints)} / 500 Rep
          </span>
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
          className="group fixed z-[9996]"
          style={{
            left: rect.left, top: rect.top, width: rect.width, height: rect.height,
            background: "rgba(0,0,0,0.5)", cursor: "not-allowed", pointerEvents: "auto",
            overflow: "visible",
          }}
        >
          <span
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            style={{ top: "calc(100% + 4px)", background: "rgba(0,0,0,0.9)", color: "var(--text-secondary)", zIndex: 10001 }}
          >
            Complete the current step first
          </span>
        </div>
      ))}

      {/* Highlight pulse on target tab(s) — renders on all matching nav buttons */}
      {highlightRect?.map((rect, i) => (
        <div
          key={`hl-${i}`}
          className="tutorial-pulse fixed z-[9997] rounded"
          style={{
            left: rect.left - 4, top: rect.top - 4,
            width: rect.width + 8, height: rect.height + 8,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Pulsing halo on target button (in-panel elements) */}
      {targetRect && (
        <div
          className="tutorial-pulse fixed z-[9998] rounded-lg"
          style={{
            left: targetRect.left - 3, top: targetRect.top - 3,
            width: targetRect.width + 6, height: targetRect.height + 6,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Pulsing highlight on Sell Scrap area to draw the eye */}
      {sellBtnRect && (
        <div
          className="tutorial-pulse fixed z-[9999] rounded"
          style={{
            left: sellBtnRect.left - 3, top: sellBtnRect.top - 3,
            width: sellBtnRect.width + 6, height: sellBtnRect.height + 6,
            background: "color-mix(in srgb, var(--accent-secondary, #ff0090) 12%, transparent)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Per-element hint highlights (e.g. clickable parts on step 5) */}
      {hintRects.map((rect, i) => (
        <div
          key={`hint-${i}`}
          className="tutorial-pulse fixed z-[9998] rounded"
          style={{
            left: rect.left - 2, top: rect.top - 2,
            width: rect.width + 4, height: rect.height + 4,
            pointerEvents: "none",
          }}
        />
      ))}

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
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {stepDef.helpDetail && (
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-50 transition-opacity hover:opacity-100"
                  style={{ color: "var(--accent)", background: "#333", fontSize: 10, fontWeight: 700 }}
                >?</button>
              )}
              <button
                onClick={toggleTutorialMinimized}
                aria-label="Minimize tutorial"
                title="Minimize"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-50 transition-opacity hover:opacity-100"
                style={{ color: "#888", background: "#333", fontSize: 14, lineHeight: 1 }}
              >
              {"\u2013"}
              </button>
              <button
                onClick={dismissTutorial}
                aria-label="Dismiss tutorial"
                title="Dismiss"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
                style={{ color: "#888", background: "#333" }}
              >
              {"\u2715"}
              </button>
            </div>

            <div className="flex items-start gap-2.5 pr-16">
              <span className="mt-0.5 shrink-0 text-lg">{stepDef.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {renderTip(currentIntroText!)}
                </p>
                <div className="mt-2.5 flex flex-col gap-2">
                  <StepDots current={tutorialStep} total={TOTAL_GUIDED_STEPS} />
                  <div className="flex items-center justify-end gap-3">
                    {introSequence && (
                      <span className="mr-auto text-xs" style={{ color: "var(--text-muted)" }}>
                        {introSubStep + 1}/{introSequence.length}
                      </span>
                    )}
                    <button onClick={skipTutorial} className="cursor-pointer text-xs opacity-50 transition-opacity hover:opacity-100" style={{ color: "var(--text-muted)" }}>Skip</button>
                    <button
                      onClick={() => {
                        if (introSequence && !introSequenceComplete) {
                          setIntroSubStep((s) => s + 1);
                        } else {
                          setCardDismissed(true);
                        }
                      }}
                      className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide transition-colors"
                      style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", boxShadow: "0 0 12px color-mix(in srgb, var(--accent, #eab308) 30%, transparent)" }}
                    >
                      {introSequence && !introSequenceComplete ? "Next" : "Got it"} &rarr;
                    </button>
                  </div>
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
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {stepDef.helpDetail && (
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-50 transition-opacity hover:opacity-100"
                  style={{ color: "var(--accent)", background: "#333", fontSize: 10, fontWeight: 700 }}
                >?</button>
              )}
              <button
                onClick={toggleTutorialMinimized}
                aria-label="Minimize tutorial"
                title="Minimize"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-50 transition-opacity hover:opacity-100"
                style={{ color: "#888", background: "#333", fontSize: 14, lineHeight: 1 }}
              >
                {"\u2013"}
              </button>
              <button
                onClick={dismissTutorial}
                aria-label="Dismiss tutorial"
                title="Dismiss"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
                style={{ color: "#888", background: "#333" }}
              >
                {"\u2715"}
              </button>
            </div>

            <div className="flex items-start gap-2.5 pr-16">
              <span className="mt-0.5 shrink-0 text-lg">{stepDef.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {renderTip(effectiveTip)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <StepDots current={tutorialStep} total={TOTAL_GUIDED_STEPS} />
                  <div className="flex items-center gap-3">
                    <button onClick={skipTutorial} className="cursor-pointer text-xs opacity-50 transition-opacity hover:opacity-100" style={{ color: "var(--text-muted)" }}>Skip</button>
                    {stepDef.dismissable && (
                      <button
                        onClick={advanceTutorial}
                        className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide transition-colors"
                        style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", boxShadow: "0 0 12px color-mix(in srgb, var(--accent, #eab308) 30%, transparent)" }}
                      >
                        Got it &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal badge — centered in the content area (offset for sidebar on desktop) */}
      {showGoal && goalContent && (
        <div className="fixed top-2 left-1/2 z-[10000] -translate-x-1/2 sm:left-[calc(50%+100px)] sm:top-2">
          <div
            className="animate-fade-up flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium"
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
              onClick={toggleTutorialMinimized}
              aria-label="Minimize tutorial"
              title="Minimize"
              className="ml-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs opacity-50 transition-opacity hover:opacity-100"
              style={{ color: "#888", background: "#333", fontSize: 12, lineHeight: 1 }}
            >
              {"\u2013"}
            </button>
            <button
              onClick={dismissTutorial}
              aria-label="Dismiss tutorial"
              title="Dismiss"
              className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs opacity-40 transition-opacity hover:opacity-100"
              style={{ color: "#888", background: "#333", fontSize: 9 }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      )}

      {/* Minimized chip — click to restore the tutorial card/badge */}
      {showMinimizedChip && (
        <button
          onClick={toggleTutorialMinimized}
          aria-label="Restore tutorial"
          title="Restore tutorial"
          className="animate-fade-up fixed z-[10000] flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg"
          style={{
            // Mobile: sit 16px above the 56px bottom nav. Desktop: just 16px from bottom.
            bottom: typeof window !== "undefined" && window.innerWidth <= 640 ? 72 : 16,
            right: 16,
            borderColor: "var(--accent-border, rgba(200,62,12,.4))",
            background: "var(--panel-bg, #181008)",
            color: "var(--accent, #c83e0c)",
            boxShadow: "0 4px 16px rgba(0,0,0,.5), 0 0 12px color-mix(in srgb, var(--accent, #c83e0c) 25%, transparent)",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontSize: "1rem" }}>{stepDef.icon}</span>
          <span>Tutorial</span>
          <span style={{ fontSize: "1rem", lineHeight: 1 }}>{"\u21E7"}</span>
        </button>
      )}

      {/* "Need help?" nudge — appears after 60s of no tutorial progress */}
      {showHelpNudge && !tutorialDismissed && (
        <div
          className="animate-fade-up fixed bottom-20 left-1/2 z-[9996] -translate-x-1/2 sm:bottom-6"
          style={{ pointerEvents: "auto" }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-lg"
            style={{
              background: "linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)",
              boxShadow: "0 0 24px color-mix(in srgb, var(--accent, #eab308) 15%, transparent), 0 4px 12px rgba(0,0,0,0.4)",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span>Stuck? Check the {renderTip("**Help**")} tab anytime.</span>
            <button
              onClick={() => setShowHelpNudge(false)}
              className="ml-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-100"
              style={{ color: "#888", background: "#333", fontSize: 9 }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>
      )}

      {/* Help detail modal */}
      {showHelpModal && stepDef.helpDetail && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div
            className="animate-fade-up mx-4 w-full max-w-sm rounded-2xl p-5"
            style={CARD_BG}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">{stepDef.icon}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>More details</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {stepDef.helpDetail}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold transition-colors"
                style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
