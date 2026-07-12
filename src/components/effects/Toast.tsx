"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/state/store";

interface UnlockGuide {
  id: string;
  title: string;
  what: string;
  where: string;
  why: string;
}

interface ToastItem {
  id: number;
  message: string;
  exiting: boolean;
  guide: UnlockGuide | null;
}

const SEEN_GUIDES_KEY = "rags-to-races-seen-unlock-guides";

export function getUnlockGuide(message: string): UnlockGuide | null {
  if (/Dirt Track Unlocked/i.test(message)) return {
    id: "circuits",
    title: "Circuits unlocked",
    what: "Circuits are new races with different entry fees, rewards, difficulty, and vehicle-tier limits.",
    where: "Find them in Race > Circuits and tap a circuit card to select it.",
    why: "Harder circuits pay more Scrap Bucks and Rep, but demand a stronger and more reliable vehicle.",
  };
  if (/Go-Kart Blueprint Unlocked/i.test(message)) return {
    id: "blueprints",
    title: "Vehicle blueprints unlocked",
    what: "Blueprints are build recipes. Each one accepts certain parts and produces a different class of vehicle.",
    where: "Find unlocked blueprints at the top of the Garage build screen.",
    why: "Higher-tier vehicles can enter tougher circuits and turn better parts into stronger race stats.",
  };
  if (/Station Equipment:/i.test(message)) return {
    id: "station-equipment",
    title: "Station equipment found",
    what: "Station equipment is reusable workshop gear with rarity, stat bonuses, and sometimes set bonuses.",
    where: "Inspect and install it in Workshop > Stations.",
    why: "Installed pieces improve activities across the game. Spare pieces can be salvaged for Reforge Shards.",
  };
  if (/Challenge Complete:/i.test(message)) return {
    id: "challenges",
    title: "Challenges explained",
    what: "Challenges are one-time objectives that pay immediate rewards such as materials, Scrap Bucks, or Forge Tokens.",
    where: "Review completed and remaining challenges in Activity from the More menu.",
    why: "They provide useful resource bursts, but they are different from permanent Achievements.",
  };
  if (/\d+-Win Streak|\d+ WINS/i.test(message)) return {
    id: "win-streaks",
    title: "Win streaks explained",
    what: "A win streak counts consecutive victories and ends when you fail to win.",
    where: "Your current and best streak are recorded in Activity and the detailed stats menu.",
    why: "Longer streaks improve the rarity odds of station-equipment drops.",
  };
  if (/Achievement:/i.test(message)) return {
    id: "achievements",
    title: "Achievements explained",
    what: "Achievements are lifetime milestones. Unlike challenges, their titles and bonuses persist through resets.",
    where: "View progress and earned rewards in Upgrades > Achievements.",
    why: "Some achievements grant permanent bonuses that strengthen every future run.",
  };
  if (/New Location:/i.test(message)) return {
    id: "locations",
    title: "Scavenge locations unlocked",
    what: "Each location has its own cost, part pool, and odds, so it changes what you are likely to find.",
    where: "Choose a location from the selector in Salvage.",
    why: "Use locations to target the kinds and quality of parts your next build needs.",
  };
  if (/Auto-Scavenge Enabled/i.test(message)) return {
    id: "automation",
    title: "Automation unlocked",
    what: "Automation repeats an activity for you on the game tick instead of requiring every manual tap.",
    where: "Configure Auto-Scavenge in Salvage. More automation becomes available later.",
    why: "It keeps early resources flowing while you focus on building, racing, and upgrades.",
  };
  if (/Legacy Points earned/i.test(message)) return {
    id: "legacy-points",
    title: "Legacy Points explained",
    what: "Legacy Points (LP) are earned by Scrap Reset and survive future Scrap Resets.",
    where: "Spend them on lasting upgrades and Garage Philosophy choices in Upgrades and Workshop.",
    why: "LP is how a reset turns one completed run into permanent progress.",
  };
  if (/Milestone:/i.test(message)) return {
    id: "prestige-milestones",
    title: "Prestige milestones explained",
    what: "Prestige milestones are free permanent rewards earned at specific Scrap Reset counts.",
    where: "Review the full track in Upgrades > Prestige.",
    why: "Later milestones can reshape scavenging, racing, automation, or how a new run begins.",
  };
  return null;
}

function getAnnouncementPresentation(message: string): { eyebrow: string; icon: string } {
  if (/unlocked|new location|enabled/i.test(message)) return { eyebrow: "New Unlock", icon: "\u{1F513}" };
  if (/achievement/i.test(message)) return { eyebrow: "Achievement", icon: "\u{1F3C6}" };
  if (/milestone|legacy points/i.test(message)) return { eyebrow: "Milestone", icon: "\u{2B50}" };
  if (/rival defeated/i.test(message)) return { eyebrow: "Rival Defeated", icon: "\u{1F3C1}" };
  return { eyebrow: "Progress Update", icon: "\u{1F389}" };
}

function loadSeenGuides(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const value = JSON.parse(window.localStorage.getItem(SEEN_GUIDES_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

let nextId = 0;

export default function ToastContainer() {
  const unlockEvents = useGameStore((s) => s.unlockEvents);
  const clearUnlockEvents = useGameStore((s) => s.clearUnlockEvents);
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const processedRef = useRef(0);
  const seenGuidesRef = useRef<Set<string> | null>(null);
  const active = queue[0];

  useEffect(() => {
    if (unlockEvents.length === 0) return;
    const newEvents = unlockEvents.slice(processedRef.current);
    if (newEvents.length === 0) return;
    processedRef.current = unlockEvents.length;
    const seen = seenGuidesRef.current ?? loadSeenGuides();
    seenGuidesRef.current = seen;

    const additions = newEvents.map((message) => {
      const candidate = getUnlockGuide(message);
      const guide = candidate && !seen.has(candidate.id) ? candidate : null;
      if (guide) seen.add(guide.id);
      return { id: nextId++, message, exiting: false, guide };
    });
    window.localStorage.setItem(SEEN_GUIDES_KEY, JSON.stringify([...seen]));
    setQueue((current) => [...current, ...additions]);

    const clearTimer = window.setTimeout(() => {
      clearUnlockEvents();
      processedRef.current = 0;
    }, 0);
    return () => window.clearTimeout(clearTimer);
  }, [unlockEvents, clearUnlockEvents]);

  const dismissActive = useCallback(() => {
    setQueue((current) => current.length === 0 ? current : [{ ...current[0], exiting: true }, ...current.slice(1)]);
    window.setTimeout(() => setQueue((current) => current.slice(1)), 250);
  }, []);

  useEffect(() => {
    if (!active || active.guide || active.exiting) return;
    const timer = window.setTimeout(dismissActive, 7000);
    return () => window.clearTimeout(timer);
  }, [active, dismissActive]);

  if (!active) return null;
  const presentation = getAnnouncementPresentation(active.message);

  if (active.guide) {
    return (
      <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="unlock-guide-title">
        <section
          className={`w-full max-w-md rounded-2xl border p-5 ${active.exiting ? "animate-slide-out" : "animate-slide-in"}`}
          style={{ borderColor: "var(--accent-border)", background: "var(--modal-bg, #041820)", boxShadow: "0 0 42px color-mix(in srgb, var(--accent) 28%, transparent), 0 24px 60px rgba(0,0,0,.7)" }}
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-2xl" style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}>{presentation.icon}</div>
            <div>
              <div className="text-[.65rem] font-bold uppercase tracking-[.2em]" style={{ color: "var(--accent)" }}>New system unlocked</div>
              <h2 id="unlock-guide-title" className="mt-1 text-lg font-bold" style={{ color: "var(--text-heading)" }}>{active.guide.title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{active.message}</p>
            </div>
          </div>
          <div className="space-y-3">
            <GuideRow label="What it is" text={active.guide.what} />
            <GuideRow label="Where to find it" text={active.guide.where} />
            <GuideRow label="Why it matters" text={active.guide.why} />
          </div>
          <button onClick={dismissActive} className="mt-5 min-h-12 w-full rounded-lg px-4 text-sm font-bold" style={{ color: "var(--btn-primary-text)", background: "var(--btn-primary-bg)" }}>
            Okay, got it
          </button>
          {queue.length > 1 && <p className="mt-2 text-center text-[.65rem] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{queue.length - 1} more update{queue.length === 2 ? "" : "s"} waiting</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed top-20 left-1/2 z-[9998] w-[min(420px,calc(100%-2rem))] -translate-x-1/2 sm:top-24">
      <div role="status" className={`pointer-events-auto overflow-hidden rounded-xl border p-4 ${active.exiting ? "animate-slide-out" : "animate-slide-in"}`} style={{ borderColor: "var(--accent-border)", background: "var(--modal-bg, #041820)", boxShadow: "0 0 36px color-mix(in srgb, var(--accent) 24%, transparent), 0 18px 40px rgba(0,0,0,.55)" }}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xl" style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}>{presentation.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[.65rem] font-bold uppercase tracking-[.2em]" style={{ color: "var(--accent)" }}>{presentation.eyebrow}</div>
            <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text-primary)" }}>{active.message}</p>
          </div>
          <button onClick={dismissActive} aria-label="Dismiss announcement" className="shrink-0 rounded-md border px-2 py-1 text-xs font-bold" style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-bg)" }}>Got it</button>
        </div>
        <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full" style={{ background: "var(--divider)" }}><div className="unlock-announcement-timer h-full w-full" style={{ background: "var(--accent)" }} /></div>
        {queue.length > 1 && <p className="mt-2 text-right text-[.6rem] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{queue.length - 1} more</p>}
      </div>
    </div>
  );
}

function GuideRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--panel-border)", background: "var(--accent-bg)" }}>
      <div className="text-[.65rem] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>{label}</div>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{text}</p>
    </div>
  );
}
