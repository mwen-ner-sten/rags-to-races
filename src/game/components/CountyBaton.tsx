"use client";

import { BATON_PART, batonUnlocked, FREIGHT_COST, otherCounty } from "@/core/countyBaton";
import type { BatonChoice } from "@/core/countyBaton";
import { HOME_COUNTIES } from "@/core/counties";
import { venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { salvageCarryCandidates } from "@/core/salvageCarry";
import type { GameState, NeighborCounty } from "@/core/types";
import { conditionName } from "../format";

export function CountyBatonPlanner({ game, choice, onChoose, onContinue }: { game: GameState; choice?: BatonChoice; onChoose: (choice?: BatonChoice) => void; onContinue: (county: NeighborCounty, uid: string) => void }) {
  if (!batonUnlocked(game)) return null;
  const current = game.run.countyBaton;
  const qualified = current?.leg === "qualify" ? current.qualified : undefined;
  const donor = qualified && salvageCarryCandidates(game).find(({ part }) => part.uid === qualified.uid)?.part;
  const discipline = game.era?.discipline ?? "dirt";
  return (
    <fieldset>
      <legend>County Baton</legend>
      <p className="hint">In River or Quarry County, win the {venueName("dirt", discipline)} Feature in a Go-Kart using this Season’s native salvage. Next Scrap Reset, put that exact part in the one-slot crate and move to the other county. Fit it to a Beater and win the {venueName("county_fair", discipline)} Feature there.</p>
      <p className="hint">The receiving county will then let you pay {FREIGHT_COST} Legacy Points in future Seasons to carry a neighbor’s native part and keep your perk slots.</p>
      <label className="check"><input type="radio" name="county-baton" checked={!choice} onChange={() => onChoose()} /> No County Baton attempt</label>
      <label className="check"><input type="radio" name="county-baton" checked={choice === "start"} onChange={() => onChoose("start")} /> Start from the selected home county</label>
      {qualified && current && <label className="check"><input type="radio" name="county-baton" disabled={!donor} checked={choice === "carry"} onChange={() => onContinue(otherCounty(current.from), qualified.uid)} />
        {donor ? `Carry ${getPart(donor.partId).name} (${conditionName(donor.condition)}) to ${HOME_COUNTIES[otherCounty(current.from)].name} for one perk slot` : "Qualifying part is no longer eligible for carryover"}
      </label>}
    </fieldset>
  );
}

export function CountyBatonStatus({ game }: { game: GameState }) {
  const current = game.run.countyBaton;
  const permits = (["river", "quarry"] as const).filter((county) => game.meta.countyFreight?.[county]);
  const discipline = game.era?.discipline ?? "dirt";
  if (!current && !batonUnlocked(game) && (game.meta.challengeRecords.parts_with_a_past?.completions ?? 0) < 1) return null;
  return (
    <>
      <h3 className="label">County Baton</h3>
      {!current && <p className="hint">{batonUnlocked(game) ? "Start a two-Season attempt in River or Quarry County at Scrap Reset." : "Unlock with two Parts With a Past completions and the county passport."}</p>}
      {current?.leg === "qualify" && <p>{current.qualified ? `Qualified. Use Scrap Reset to carry the same part to ${HOME_COUNTIES[otherCounty(current.from)].name}.` : `Win the ${venueName("dirt", discipline)} Feature in a Go-Kart with a ${getPart(BATON_PART[current.from]).name} hauled from your home county this Season.`}</p>}
      {current?.leg === "deliver" && <p>{current.completedAt === undefined ? `Fit your inherited ${getPart(BATON_PART[current.from]).name} to a Beater and win the ${venueName("county_fair", discipline)} Feature. Repeat wins count.` : "Delivered. Your new freight permit is available at future Scrap Resets."}</p>}
      {current && (current.leg === "qualify" || current.completedAt === undefined) && <p className="hint">Any reset outside the planned transfer forfeits the unfinished attempt. Earned freight permits and Parts With a Past records stay.</p>}
      {permits.length > 0 && <p className="hint">Freight permits: {permits.map((county) => `${HOME_COUNTIES[county].name} (${game.meta.countyFreight?.[county]})`).join(", ")}. When resetting into a permitted county, pay {FREIGHT_COST} Legacy Points to carry its neighbor’s native part without using a perk slot.</p>}
    </>
  );
}
