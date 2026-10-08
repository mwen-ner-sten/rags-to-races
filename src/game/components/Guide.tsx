"use client";

import { GUIDE, type GuideTab, guideStep } from "@/core/guide";
import { useGame } from "../store";

/** The first-Season guide: one step at a time, with a way to jump to where it happens. */
export function Guide({ tab, onShow }: { tab: string; onShow: (tab: GuideTab) => void }) {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  if (!game) return null;
  const current = guideStep(game);
  if (!current) return null;
  const { step, index } = current;
  return (
    <section className="guide" aria-labelledby="guide-h">
      <div className="guide-head">
        <span className="guide-count num">
          Step {index + 1} of {GUIDE.length}
        </span>
        <h2 id="guide-h">{step.title}</h2>
      </div>
      <p>{step.how(game)}</p>
      <div className="guide-actions">
        {tab !== step.tab && (
          <button className="btn small primary" onClick={() => onShow(step.tab)} aria-label="Show me where">
            Show me
          </button>
        )}
        <button className="link-btn" onClick={() => dispatch({ type: "setGuide", on: false })}>
          Hide the guide
        </button>
      </div>
    </section>
  );
}
