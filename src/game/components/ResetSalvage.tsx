"use client";

import { partOriginLabel } from "@/core/provenance";
import { FREIGHT_COST, salvageCarryCandidates, salvageCarryUnlocked } from "@/core/salvageCarry";
import type { GameState } from "@/core/types";
import { partChoice } from "./BuildSlotRow";
import { ChoiceList, type ChoiceItem } from "./ChoiceList";

export function ResetSalvage({ game, value, slots, rookie, freight, onFreight, onChange }: { game: GameState; value: string; slots: number; rookie: boolean; freight: boolean; onFreight?: (paid: boolean) => void; onChange: (value: string) => void }) {
  if (!salvageCarryUnlocked(game)) return null;
  const candidates = salvageCarryCandidates(game);
  const items: ChoiceItem[] = [
    { id: "", title: "None", meta: `Keep all ${slots} perk slots` },
    ...(value && !candidates.some(({ part }) => part.uid === value) ? [{ id: value, title: "Selected part unavailable" }] : []),
    ...candidates.map(({ part, location }): ChoiceItem => ({
      ...partChoice(part, `${location}${part.provenance ? ` · ${partOriginLabel(part)}` : ""}`),
      disabled: rookie,
    })),
  ];
  const remaining = freight ? slots : slots - 1;
  return (
    <fieldset>
      <legend>Salvage carryover</legend>
      <p className="hint">Bring one hauled part of tier 2 or below. It keeps its condition and normally occupies one of your {slots} perk slots for the next Season. A part can cross only one reset.</p>
      <ChoiceList label="Part to carry" value={value} onChange={onChange} items={items} />
      {onFreight && !rookie && <label className="check"><input type="checkbox" checked={freight} onChange={(event) => onFreight(event.target.checked)} /> Pay {FREIGHT_COST} Legacy Points for freight and keep all perk slots</label>}
      {rookie ? <p className="why">Rookie Plates disables salvage carryover.</p>
        : candidates.length === 0 ? <p className="why">No eligible parts are available.</p> : null}
      {value && <p className="hint">{remaining === 1 ? "1 perk slot remains" : `${remaining} perk slots remain`}. The carried part starts loose in the garage.</p>}
    </fieldset>
  );
}
