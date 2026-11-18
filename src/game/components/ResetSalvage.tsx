"use client";

import { getPart } from "@/core/content/parts";
import { salvageCarryCandidates, salvageCarryUnlocked } from "@/core/salvageCarry";
import type { GameState } from "@/core/types";
import { conditionName } from "../format";

export function ResetSalvage({ game, value, slots, rookie, onChange }: { game: GameState; value: string; slots: number; rookie: boolean; onChange: (value: string) => void }) {
  if (!salvageCarryUnlocked(game)) return null;
  const candidates = salvageCarryCandidates(game);
  const remaining = slots - 1;
  return (
    <fieldset>
      <legend>Salvage carryover</legend>
      <p className="hint">Bring one hauled part of tier 2 or below. It keeps its condition and occupies one of your {slots} perk slots for the next Season. A part can cross only one reset.</p>
      <label className="inline">
        <span>Part to carry</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">None · keep all {slots} perk slots</option>
          {value && !candidates.some(({ part }) => part.uid === value) && <option value={value}>Selected part unavailable</option>}
          {candidates.map(({ part, location }) => (
            <option key={part.uid} value={part.uid} disabled={rookie}>{getPart(part.partId).name} · {conditionName(part.condition)} · {location}</option>
          ))}
        </select>
      </label>
      {rookie ? <p className="why">Rookie Plates disables salvage carryover.</p>
        : candidates.length === 0 ? <p className="why">No eligible parts are available.</p> : null}
      {value && <p className="hint">{remaining === 1 ? "1 perk slot remains" : `${remaining} perk slots remain`}. The carried part starts loose in the garage.</p>}
    </fieldset>
  );
}
