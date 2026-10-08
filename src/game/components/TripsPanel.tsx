"use client";

import Image from "next/image";
import { useState } from "react";
import { channel } from "@/core/channels";
import { KNOWHOW_BY_ID } from "@/core/content/knowhow";
import { PLACES, codexLevel } from "@/core/content/places";
import { TOOLS } from "@/core/content/tools";
import { SHELL_PRICE } from "@/core/content/vehicles";
import { DRIVEWAY_RULES, DRIVEWAY_SPACE, drivewayRule, garageSpace } from "@/core/garage";
import { carryFor } from "@/core/haul";
import { baseDuration, jobBlocker } from "@/core/jobs";
import { canOpenPlace, knowhowTier, placeRepCost } from "@/core/knowhowEngine";
import type { GameState, MaterialId, PartCategory } from "@/core/types";
import { duration, num } from "../format";
import { placeSprite } from "../sprites";
import { useGame } from "../store";
import { Tips } from "./Tips";

const FOCUS: PartCategory[] = ["engine", "wheel", "frame", "fuel", "electronics", "drivetrain", "exhaust"];
const TIER_LABEL = { learning: "", familiar: "Familiar", second_nature: "Second Nature" } as const;

/** Warns before a trip when its finds won't all fit in the garage. */
function roomNote(game: GameState): string | null {
  const free = garageSpace(game) - game.run.inventory.length;
  const carry = carryFor(game);
  if (free >= carry) return null;
  const extra = carry - Math.max(0, free);
  const lead = free <= 0 ? "The garage is full, so finds" : `Only ${free} space${free > 1 ? "s" : ""} left in the garage, so up to ${extra} find${extra > 1 ? "s" : ""}`;
  const overflow = game.run.driveway.length + extra > DRIVEWAY_SPACE;
  const rule = DRIVEWAY_RULES.find((r) => r.id === drivewayRule(game));
  return `${lead} will wait on the driveway (${game.run.driveway.length}/${DRIVEWAY_SPACE}).${overflow ? ` If it overflows, ${rule?.text}.` : ""}`;
}

function PlaceCard({ game, placeId }: { game: GameState; placeId: string }) {
  const dispatch = useGame((s) => s.dispatch);
  const [focus, setFocus] = useState<PartCategory | "">("");
  const place = PLACES.find((p) => p.id === placeId)!;
  const open = game.run.placesOpen.includes(placeId);
  const knowhowId = `place:${placeId}`;
  const def = KNOWHOW_BY_ID[knowhowId];
  const level = codexLevel(game.meta.codex.places[placeId] ?? 0);
  const spec = { kind: "haul" as const, placeId, focus: focus || undefined };
  const blocker = open ? jobBlocker(game, spec) : null;
  const openBlocker = !open && def ? canOpenPlace(game, knowhowId) : null;
  const tier = def ? knowhowTier(game, knowhowId) : "learning";
  const scouting = game.run.learned.includes("tech:scouting");

  return (
    <article className={`card place ${open ? "" : "locked"}`}>
      <Image src={placeSprite(placeId)} alt="" width={96} height={64} />
      <div className="card-body">
        <h3>{place.name}</h3>
        <p className="blurb">{place.blurb}</p>
        <dl className="facts">
          <div>
            <dt>Trip</dt>
            <dd className="num">{duration(baseDuration(game, spec))}</dd>
          </div>
          <div>
            <dt>Carry</dt>
            <dd className="num">{carryFor(game)}</dd>
          </div>
          {place.fee > 0 && (
            <div>
              <dt>Fee</dt>
              <dd className="num">{place.fee}</dd>
            </div>
          )}
          <div>
            <dt>Codex</dt>
            <dd className="num">Lv {level}</dd>
          </div>
        </dl>
        {open ? (
          <div className="actions">
            {scouting && (
              <label>
                <span className="sr-only">Look for</span>
                <select value={focus} onChange={(e) => setFocus(e.target.value as PartCategory | "")}>
                  <option value="">Anything</option>
                  {FOCUS.map((c) => (
                    <option key={c} value={c}>
                      Look for {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => dispatch({ type: "enqueue", spec })}>
              Go
            </button>
            {blocker && <span className="why">{blocker}</span>}
            {!blocker && roomNote(game) && <span className="why">{roomNote(game)}</span>}
          </div>
        ) : (
          <div className="actions">
            {tier !== "learning" && <span className="chip">{TIER_LABEL[tier]}</span>}
            <button className="btn" disabled={!!openBlocker} title={openBlocker ?? undefined} onClick={() => dispatch({ type: "openPlace", knowhowId })}>
              Open · {placeRepCost(game, knowhowId)} Rep
            </button>
            {openBlocker && <span className="why">{openBlocker}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function Tools({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  return (
    <section aria-labelledby="tools-h" className="section">
      <h2 id="tools-h">Tools counter</h2>
      <Tips ids={["tools"]} />
      <p className="sub">Bought with Scrap Bucks. They stay until the Season ends.</p>
      <div className="grid-list">
        {TOOLS.map((tool) => {
          const owned = game.run.tools[tool.id] ?? 0;
          const maxed = owned >= tool.max;
          const mats = Object.entries(tool.materials).map(([m, n]) => `${n} ${m}`);
          const short = game.run.cash < tool.cash || Object.entries(tool.materials).some(([m, n]) => game.run.materials[m as MaterialId] < (n ?? 0));
          return (
            <div key={tool.id} className="row-card">
              <div>
                <strong>{tool.name}</strong> {tool.max > 1 && <span className="muted num">{owned}/{tool.max}</span>}
                <p className="blurb">{tool.blurb}</p>
              </div>
              <button className="btn" disabled={maxed || short} onClick={() => dispatch({ type: "buyTool", toolId: tool.id })}>
                {maxed ? "Owned" : `${num(tool.cash)} SB${mats.length ? ` + ${mats.join(", ")}` : ""}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TripsPanel() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  if (!game) return null;
  const places = PLACES.filter((p) => p.id === "curb" || game.run.revealed.includes("places") || game.run.placesOpen.includes(p.id));
  const visible = places.filter((p) => {
    if (game.run.placesOpen.includes(p.id) || p.id === "yards") return true;
    const def = KNOWHOW_BY_ID[`place:${p.id}`];
    return def ? def.trigger(game) : false;
  });
  const auctionOpen = game.run.placesOpen.includes("auction");
  return (
    <div className="panel">
      <section className="section" aria-labelledby="trips-h">
        <h2 id="trips-h">Trips</h2>
        <Tips ids={["places"]} />
        <p className="sub">Each trip takes you away for a while and brings home what you can carry ({num(channel(game, "carry"))} parts).</p>
        <div className="cards">
          {visible.map((p) => (
            <PlaceCard key={p.id} game={game} placeId={p.id} />
          ))}
        </div>
        {auctionOpen && (
          <div className="row-card highlight">
            <div>
              <strong>Sedan shell</strong>
              <p className="blurb">The auction has a rotten four-door with your name on it. It needs cleaning, then Bodywork, before it can become a Beater.</p>
            </div>
            <button className="btn" disabled={game.run.cash < SHELL_PRICE} onClick={() => dispatch({ type: "buyShell" })}>
              Buy · {SHELL_PRICE} SB
            </button>
          </div>
        )}
      </section>
      {game.run.revealed.includes("tools") && <Tools game={game} />}
    </div>
  );
}
