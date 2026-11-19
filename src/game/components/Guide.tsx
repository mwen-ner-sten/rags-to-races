"use client";

import { GUIDE, type GuideTab, guideStep } from "@/core/guide";
import type { CareerDestination } from "@/core/careerAdvice";
import { useGame } from "../store";

/** The first-Season guide: one step at a time, with a way to jump to where it happens. */
export function Guide({ tab, onShow, onOpen }: { tab: string; onShow: (tab: GuideTab) => void; onOpen: (target: CareerDestination) => void }) {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  if (!game) return null;
  const current = guideStep(game);
  if (!current) return null;
  const { step, index } = current;
  const workshopOpen = game.run.revealed.includes("bench");
  return (
    <section className="guide" aria-labelledby="guide-h">
      <div className="guide-head">
        <span className="guide-count num">
          Step {index + 1} of {GUIDE.length}
        </span>
        <h2 id="guide-h">{step.title}</h2>
      </div>
      <p>{step.how(game)}</p>
      {workshopOpen && (
        <p>You can also fix up a part for a paying customer. Three finished jobs and a hauler let you move the shop to a new Season.</p>
      )}
      <div className="guide-actions">
        {tab !== step.tab && (
          <button className="btn small primary" onClick={() => (step.garage ? onOpen({ tab: "garage", section: step.garage }) : onShow(step.tab))} aria-label="Show me where">
            Show me
          </button>
        )}
        {workshopOpen && (
          <button className="btn small" onClick={() => {
            if (dispatch({ type: "pinCareer", pin: "paid-work" })) onOpen({ tab: "garage", section: "service" });
          }}>
            Follow the workshop route
          </button>
        )}
        <button className="link-btn" onClick={() => dispatch({ type: "setGuide", on: false })}>
          Hide the guide
        </button>
      </div>
    </section>
  );
}
