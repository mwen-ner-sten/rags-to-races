"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "\u{1F527}",
    title: "Welcome to Rags to Races!",
    body: "You start with nothing but a junkyard. Scavenge parts, build vehicles, and race your way to glory.",
  },
  {
    icon: "\u{1F50D}",
    title: "Scavenge Parts",
    body: "Head to the Junkyard tab and click Scavenge to find parts. Parts come in different conditions \u2014 better condition means better stats. After 100 clicks, auto-scavenge kicks in!",
  },
  {
    icon: "\u{1F697}",
    title: "Build a Vehicle",
    body: "Switch to the Garage tab. Pick a vehicle blueprint, fill its slots with parts from your inventory, and hit Build. Then Activate it for racing.",
  },
  {
    icon: "\u{1F3C6}",
    title: "Race for Glory",
    body: "In the Race tab, pick a circuit and enter a race. Win to earn Scrap Bucks and Rep Points. Rep unlocks new locations, circuits, and vehicles.",
  },
  {
    icon: "\u2B50",
    title: "Keep Climbing",
    body: "Unlock the Workshop for upgrades, the Locker for gear, and eventually Prestige to reset with permanent bonuses. Good luck out there!",
  },
];

export default function IntroWalkthrough() {
  const hasSeenIntro = useGameStore((s) => s.hasSeenIntro);
  const dismissIntro = useGameStore((s) => s.dismissIntro);
  const [step, setStep] = useState(0);

  if (hasSeenIntro) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="animate-fade-up mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
        }}
      >
        {/* Icon */}
        <div className="mb-3 text-center text-4xl">{current.icon}</div>

        {/* Title */}
        <h2
          className="mb-2 text-center text-lg font-bold"
          style={{ color: "var(--text-heading)" }}
        >
          {current.title}
        </h2>

        {/* Body */}
        <p
          className="mb-6 text-center text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {current.body}
        </p>

        {/* Step dots */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full transition-colors"
              style={{
                background:
                  i === step ? "var(--accent)" : "var(--panel-border)",
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          {/* Skip */}
          <button
            onClick={dismissIntro}
            className="cursor-pointer text-xs underline opacity-60 transition-opacity hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            Skip
          </button>

          <div className="flex gap-2">
            {/* Back */}
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  borderColor: "var(--btn-border)",
                  color: "var(--text-primary)",
                  background: "transparent",
                }}
              >
                Back
              </button>
            )}

            {/* Next / Get Started */}
            <button
              onClick={isLast ? dismissIntro : () => setStep(step + 1)}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
