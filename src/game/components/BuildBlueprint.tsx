"use client";

import Image from "next/image";
import { useState } from "react";
import { blueprintPlan, haulSourcesForSlot } from "@/core/buildPlanning";
import { getPart } from "@/core/content/parts";
import type { VehicleDef } from "@/core/content/vehicles";
import { jobBlocker } from "@/core/jobs";
import type { GameState } from "@/core/types";
import { num, pct } from "../format";
import { vehicleSprite } from "../sprites";
import { useGame } from "../store";
import { partOriginLabel } from "@/core/provenance";
import { partScoreAt } from "@/core/race";
import type { SlotDef } from "@/core/content/vehicles";
import type { PartInstance } from "@/core/types";
import { PartTitle, partOption } from "./BuildSlotRow";
import { ChoiceList, type ChoiceItem } from "./ChoiceList";

interface SlotPickerProps {
  game: GameState;
  slot: SlotDef;
  options: readonly PartInstance[];
  value: string;
  onChange: (uid: string) => void;
}

/** One blueprint slot: the chosen part, with the other fitting parts a Change click away. */
function SlotPicker({ game, slot, options, value, onChange }: SlotPickerProps) {
  const discipline = game.era?.discipline ?? "dirt";
  const score = (part: PartInstance) => partScoreAt(part, discipline, undefined, slot.slot);
  const top = options.length > 1 ? Math.max(...options.map(score)) : undefined;
  const rows = options.map((part): ChoiceItem => ({
    id: part.uid,
    title: <PartTitle part={part} />,
    tag: top !== undefined && score(part) === top ? "Best fit" : undefined,
    meta: <>score <span className="num">{score(part).toFixed(1)}</span> · {partOriginLabel(part)}</>,
  }));
  const label = (slot.label ?? slot.slot) + (slot.required ? "" : " (optional)");
  const emptyText = `Needs ${slot.accepts.map((id) => getPart(id).name).join(" or ")}`;
  return (
    <ChoiceList
      label={label}
      compact
      items={rows.length ? [{ id: "", title: "None" }, ...rows] : []}
      value={value}
      onChange={onChange}
      emptyText={emptyText}
    />
  );
}

export function Blueprint({ game, def }: { game: GameState; def: VehicleDef }) {
  const dispatch = useGame((s) => s.dispatch);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const plan = blueprintPlan(game, def, picks);
  const spec = { kind: "assemble" as const, vehicleId: def.id, partUids: plan.chosen, name: "" };
  const blocker = jobBlocker(game, spec);
  const mats = Object.entries(def.materials).map(([m, n]) => `${n} ${m}`);
  return (
    <article className="card blueprint">
      <Image src={vehicleSprite(def.id)} alt="" width={120} height={80} />
      <div className="card-body">
        <h3>
          {def.name} <span className="muted">Tier {def.tier}</span>
        </h3>
        <p className="blurb">{def.blurb}</p>
        <p className="hint">Required parts ready · {plan.ready}/{plan.required}</p>
        {plan.missing.length > 0 && <p className="why">Still needed · {plan.missing.map(({ material, deficit }) => `${deficit} ${material}`).join(", ")}</p>}
        {game.run.cash < def.cash && <p className="why">Still needed · {num(def.cash - game.run.cash)} Scrap Bucks</p>}
        <div className="slots">
          {plan.slots.map(({ slot, options, fixable }) => {
            const sources = slot.required && !plan.chosen[slot.slot] ? haulSourcesForSlot(game, slot) : [];
            return (
              <div key={slot.slot} className="slot slot-choice">
                <SlotPicker game={game} slot={slot} options={options} value={plan.chosen[slot.slot] ?? ""} onChange={(uid) => setPicks({ ...picks, [slot.slot]: uid })} />
                {options.length === 0 && fixable.length > 0 && <span className="why">On hand but needs bench work · {fixable.map(partOption).join(", ")}</span>}
                {sources.length > 0 && <span className="hint">Per random find: {sources.map(({ place, chance }) => `${place.name} ${pct(chance)}`).join(" · ")}</span>}
              </div>
            );
          })}
        </div>
        <div className="actions">
          <button className="btn primary wrap" disabled={!!blocker} onClick={() => dispatch({ type: "enqueue", spec })}>
            Assemble{def.cash ? ` · ${num(def.cash)} Scrap Bucks` : ""}
            {mats.length ? ` + ${mats.join(", ")}` : ""}
          </button>
          {blocker && <span className="why">{blocker}</span>}
        </div>
      </div>
    </article>
  );
}
