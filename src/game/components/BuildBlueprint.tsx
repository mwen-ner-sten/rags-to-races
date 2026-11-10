"use client";

import Image from "next/image";
import { useState } from "react";
import { getPart } from "@/core/content/parts";
import type { VehicleDef } from "@/core/content/vehicles";
import { reservedPartUids } from "@/core/garage";
import { jobBlocker } from "@/core/jobs";
import { partScoreAt } from "@/core/race";
import type { GameState, PartInstance } from "@/core/types";
import { num } from "../format";
import { vehicleSprite } from "../sprites";
import { useGame } from "../store";
import { fittingParts, partOption } from "./BuildSlotRow";

type Slot = VehicleDef["slots"][number];

export function Blueprint({ game, def }: { game: GameState; def: VehicleDef }) {
  const dispatch = useGame((s) => s.dispatch);
  const discipline = game.era?.discipline ?? "dirt";
  const reserved = reservedPartUids(game);
  const free = game.run.inventory.filter((p) => !reserved.has(p.uid));
  const best = (slot: Slot, used: Set<string>): PartInstance | undefined =>
    fittingParts(free, slot)
      .filter((p) => !used.has(p.uid))
      .sort((a, b) => partScoreAt(b, discipline, undefined, slot.slot) - partScoreAt(a, discipline, undefined, slot.slot))[0];
  const [picks, setPicks] = useState<Record<string, string>>({});
  const used = new Set<string>();
  const chosen: Record<string, string> = {};
  for (const slot of def.slots) {
    const picked = picks[slot.slot];
    const uid = picked !== undefined ? picked : (best(slot, used)?.uid ?? "");
    if (uid) {
      chosen[slot.slot] = uid;
      used.add(uid);
    }
  }
  const spec = { kind: "assemble" as const, vehicleId: def.id, partUids: chosen, name: "" };
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
        <div className="slots">
          {def.slots.map((slot) => {
            const options = free.filter((p) => slot.accepts.includes(p.partId));
            return (
              <label key={slot.slot} className="slot">
                <span className="slot-name">
                  {slot.slot}
                  {!slot.required && <span className="muted"> (optional)</span>}
                </span>
                <select value={chosen[slot.slot] ?? ""} onChange={(e) => setPicks({ ...picks, [slot.slot]: e.target.value })}>
                  <option value="">{options.length ? "None" : `Needs ${slot.accepts.map((id) => getPart(id).name).join(" or ")}`}</option>
                  {options.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {partOption(p)}
                    </option>
                  ))}
                </select>
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
