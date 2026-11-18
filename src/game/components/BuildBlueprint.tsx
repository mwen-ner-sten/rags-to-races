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
import { partOption } from "./BuildSlotRow";

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
            const sources = slot.required && options.length === 0 ? haulSourcesForSlot(game, slot) : [];
            return (
              <label key={slot.slot} className="slot">
                <span className="slot-name">
                  {slot.slot}
                  {!slot.required && <span className="muted"> (optional)</span>}
                </span>
                <select value={plan.chosen[slot.slot] ?? ""} onChange={(e) => setPicks({ ...picks, [slot.slot]: e.target.value })}>
                  <option value="">{options.length ? "None" : `Needs ${slot.accepts.map((id) => getPart(id).name).join(" or ")}`}</option>
                  {options.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {partOption(p)}
                    </option>
                  ))}
                </select>
                {options.length === 0 && fixable.length > 0 && <span className="why">On hand but needs bench work · {fixable.map(partOption).join(", ")}</span>}
                {sources.length > 0 && <span className="hint">Per random find: {sources.map(({ place, chance }) => `${place.name} ${pct(chance)}`).join(" · ")}</span>}
              </label>
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
