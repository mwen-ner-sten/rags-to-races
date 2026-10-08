"use client";

import { TIP_BY_ID } from "@/core/content/tips";
import type { GameState } from "@/core/types";
import { useGame } from "../store";

/** Shows the first of these tips that's relevant and not yet dismissed (one at a time, so a panel never stacks them). */
export function Tips({ ids }: { ids: readonly string[] }) {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  if (!game) return null;
  const tip = ids.map((id) => TIP_BY_ID[id]).find((t) => t && !game.meta.tipsSeen.includes(t.id) && t.when(game));
  if (!tip) return null;
  return (
    <aside className="tip" aria-label={`Tip: ${tip.title}`}>
      <p className="tip-title">{tip.title}</p>
      {tip.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <button className="link-btn" onClick={() => dispatch({ type: "dismissTip", tipId: tip.id })}>
        Got it
      </button>
    </aside>
  );
}

/** True when a tab has a tip the player hasn't read yet (drives the tab's dot). */
export function hasUnreadTip(game: GameState, ids: readonly string[]): boolean {
  return ids.some((id) => {
    const tip = TIP_BY_ID[id];
    return tip && !game.meta.tipsSeen.includes(id) && tip.when(game);
  });
}
