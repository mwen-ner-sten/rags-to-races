"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";

interface Step {
  icon: string;
  title: string;
  body: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: "\u{1F3CE}\uFE0F",
    title: "Welcome to Rags to Races",
    body: "You've got nothing but the clothes on your back and a curb full of someone else's trash. Time to turn that garbage into glory.",
    tip: "Built from garbage.",
  },
  {
    icon: "\u{1F5D1}\uFE0F",
    title: "Scavenge the Curb",
    body: "Open the Junkyard tab and hit the Scavenge button. You'll dig through curbside trash looking for anything useful \u2014 wheels, engines, random junk. Most of it's rusted, but hey, it's free.",
    tip: "Better parts come from better locations. You'll unlock those with Rep.",
  },
  {
    icon: "\u{1F9F0}",
    title: "Collect an Engine & a Wheel",
    body: "Your first ride is a push mower \u2014 it needs one engine and one wheel. Keep scavenging until you find both. Higher condition parts give better stats, but anything will do for now.",
    tip: "Parts come in conditions from Rusted (worst) to Artifact (best).",
  },
  {
    icon: "\u{1F6E0}\uFE0F",
    title: "Build Your First Ride",
    body: "Head to the Garage tab. Select the Push Mower, slot in your engine and wheel, and hit Build. It barely runs. It's beautiful. Activate it to set it as your racer.",
    tip: "\"A barely-functional push mower you found at the curb. It goes... forward. Sometimes.\"",
  },
  {
    icon: "\u{1F3C1}",
    title: "Enter the Backyard Derby",
    body: "Switch to the Race tab and enter the Backyard Derby \u2014 held in Clyde's back forty. Win to earn Scrap Bucks and Rep Points. Rep unlocks new locations, vehicles, and circuits.",
    tip: "Prize: bragging rights and $20.",
  },
  {
    icon: "\u{1F680}",
    title: "From Curb to Championship",
    body: "Scavenge better parts, build faster vehicles, and climb from backyard races to the World Championship. Unlock the Workshop for upgrades, the Locker for gear, and Prestige when you're ready to start over \u2014 stronger.",
    tip: "The rags-to-races dream is real. Good luck out there.",
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
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
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
          className="mb-3 text-center text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {current.body}
        </p>

        {/* Tip */}
        {current.tip && (
          <p
            className="mb-5 text-center text-xs italic"
            style={{ color: "var(--text-muted)" }}
          >
            {current.tip}
          </p>
        )}
        {!current.tip && <div className="mb-5" />}

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
            Skip intro
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

            {/* Next / Let's Go */}
            <button
              onClick={isLast ? dismissIntro : () => setStep(step + 1)}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              {isLast ? "Let\u2019s Go" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
