"use client";

import Image from "next/image";
import { useState } from "react";
import { channel } from "@/core/channels";
import { countyPlaceBlocker, homeCounty, HOME_COUNTIES } from "@/core/counties";
import { COUNTY_RIVALS, localRival } from "@/core/countyRivals";
import { KNOWHOW_BY_ID } from "@/core/content/knowhow";
import { PLACES, CODEX_LEVELS, codexLevel } from "@/core/content/places";
import { getPart } from "@/core/content/parts";
import { SHELL_PRICE } from "@/core/content/vehicles";
import { DRIVEWAY_RULES, DRIVEWAY_SPACE, drivewayRule, garageSpace } from "@/core/garage";
import { customerLeads } from "@/core/serviceShop";
import { carryFor, haulOdds } from "@/core/haul";
import { baseDuration, jobBlocker } from "@/core/jobs";
import { canOpenPlace, knowhowTier, placeRepCost } from "@/core/knowhowEngine";
import type { GameState, PartCategory } from "@/core/types";
import { duration, num, pct } from "../format";
import { placeSprite } from "../sprites";
import { useGame } from "../store";
import { ChannelWhy } from "./ChannelWhy";
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
  const trips = game.meta.codex.places[placeId] ?? 0;
  const level = codexLevel(trips);
  const nextLevel = CODEX_LEVELS[level + 1];
  const spec = { kind: "haul" as const, placeId, focus: focus || undefined };
  const blocker = open ? jobBlocker(game, spec) : null;
  const openBlocker = !open && def ? canOpenPlace(game, knowhowId) : null;
  const tier = def ? knowhowTier(game, knowhowId) : "learning";
  const scouting = game.run.learned.includes("tech:scouting");
  const contact = customerLeads(game);
  const scopes = scouting ? FOCUS : contact ? [contact] : [];
  const odds = open && scopes.length > 0 ? haulOdds(placeId, spec.focus).sort((a, b) => b.chance - a.chance) : [];

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
            <dd className="num">Lv {level} · {nextLevel ? `${trips}/${nextLevel} trips` : `${trips} trips`}</dd>
          </div>
        </dl>
        <div className="channel-line">
          <span>
            Carry <ChannelWhy game={game} channelId="carry" />
          </span>
          <span>
            Trip speed <ChannelWhy game={game} channelId="haul_speed" placeId={placeId} />
          </span>
        </div>
        {open ? (
          <div className="actions">
            {scopes.length > 0 && (
              <label>
                <span className="sr-only">Look for</span>
                <select value={focus} onChange={(e) => setFocus(e.target.value as PartCategory | "")}>
                  <option value="">Anything</option>
                  {scopes.map((c) => (
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
        {odds.length > 0 && (
          <details>
            <summary>Find odds per part drawn</summary>
            <ul className="milestones">
              {odds.map((entry) => <li key={entry.item}><span>{getPart(entry.item).name}</span><span className="num">{entry.chance < 0.005 ? "<1%" : pct(entry.chance)}</span></li>)}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}

export function TripsPanel() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  if (!game) return null;
  const county = HOME_COUNTIES[homeCounty(game)];
  const rival = localRival(game);
  const places = PLACES.filter((p) => !countyPlaceBlocker(game, p.id) && (p.id === "curb" || p.id === county.source || game.run.revealed.includes("places") || game.run.placesOpen.includes(p.id)
    || placeRepCost(game, `place:${p.id}`) === 0));
  const visible = places.filter((p) => {
    if (game.run.placesOpen.includes(p.id) || p.id === "yards" || p.id === county.source) return true;
    const def = KNOWHOW_BY_ID[`place:${p.id}`];
    return def ? def.trigger(game) : false;
  });
  const auctionOpen = game.run.placesOpen.includes("auction");
  return (
    <div className="panel">
      <section className="section" aria-labelledby="trips-h">
        <h2 id="trips-h">Trips</h2>
        {game.config.homeCounty && <p className="hint">Home county · {county.name}</p>}
        {rival && !game.countyRivals?.[rival]?.earned && <p className="hint">Fit a part from a local haul to a Push Mower to race {COUNTY_RIVALS[rival].name} in the county matchup.</p>}
        <Tips ids={["places"]} />
        <p className="sub">Each trip takes you away for a while and brings home what you can carry ({num(channel(game, "carry"))} parts).</p>
        {Object.values(game.meta.codex.places).some((n) => n > 0) && <p className="hint">Each Codex level makes trips there 5% faster and finds a little less rusty.</p>}
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
            <div className="row-action">
              <button className="btn wrap" disabled={game.run.cash < SHELL_PRICE} onClick={() => dispatch({ type: "buyShell" })}>
                Buy · {SHELL_PRICE} Scrap Bucks
              </button>
              {game.run.cash < SHELL_PRICE && <span className="why">Needs {num(SHELL_PRICE - game.run.cash)} more Scrap Bucks</span>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
