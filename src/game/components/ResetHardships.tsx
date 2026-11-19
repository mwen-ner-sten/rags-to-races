"use client";

import { HARDSHIPS } from "@/core/content/modifiers";
import { hardshipCap } from "@/core/layers";
import type { GameState } from "@/core/types";

interface ResetHardshipsProps {
  game: GameState;
  chosen: string[];
  conflict: string | null;
  onChange: (hardships: string[]) => void;
}

export function ResetHardships({ game, chosen, conflict, onChange }: ResetHardshipsProps) {
  const cap = hardshipCap(game);
  return (
    <fieldset>
      <legend>Hardships (optional, up to {cap})</legend>
      <p className="hint">Win the State Feature with a hardship on and it counts double.</p>
      {HARDSHIPS.map((h) => (
        <label key={h.id} className="check">
          <input
            type="checkbox"
            checked={chosen.includes(h.id)}
            disabled={!chosen.includes(h.id) && chosen.length >= cap}
            onChange={(e) => onChange(e.target.checked ? [...chosen, h.id] : chosen.filter((x) => x !== h.id))}
          />
          <span>
            <strong>{h.name}</strong>: {h.rule} Reward: {h.reward}. <span className="muted">Done {game.meta.hardshipMastery[h.id] ?? 0}×</span>
          </span>
        </label>
      ))}
      {conflict && (
        <p className="why" role="alert">
          {conflict}
        </p>
      )}
    </fieldset>
  );
}
