"use client";

import { counterBlocker } from "@/core/actions";
import { PARTS } from "@/core/content/parts";
import { VEHICLES } from "@/core/content/vehicles";
import { counterPrice } from "@/core/garage";
import type { GameState } from "@/core/types";
import { num } from "../format";
import { useGame } from "../store";
import { Blueprint } from "./BuildBlueprint";
import { BuildVehicleCard } from "./BuildVehicleCard";
import { SwapMeet } from "./SwapMeet";
import { Tips } from "./Tips";

function PartsCounter({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const seen = PARTS.filter((p) => (game.meta.codex.parts[p.id] ?? 0) > 0 && p.category !== "junk" && p.category !== "body");
  const buyable = seen.filter((p) => {
    const reason = counterBlocker(game, p.id);
    return !reason || reason.startsWith("Needs");
  });
  if (buyable.length === 0) return null;
  return (
    <section className="section" aria-labelledby="counter-h">
      <h2 id="counter-h">Parts counter</h2>
      <p className="sub">Orders any part you’ve seen, in Good condition, for three times its value.</p>
      <div className="grid-list">
        {buyable.map((p) => (
          <div key={p.id} className="row-card">
            <div>
              <strong>{p.name}</strong> <span className="muted">T{p.tier} {p.category}</span>
            </div>
            <div className="row-action">
              <button className="btn small wrap" disabled={!!counterBlocker(game, p.id)} onClick={() => dispatch({ type: "buyPart", partId: p.id })}>
                {num(counterPrice(game, p.id))} Scrap Bucks
              </button>
              {counterBlocker(game, p.id) && <span className="why">{counterBlocker(game, p.id)}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BuildPanel() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const owned = new Set(game.run.vehicles.map((v) => v.vehicleId));
  const blueprints = VEHICLES.filter((v) => !v.blueprint || game.run.learned.includes(v.blueprint));
  return (
    <>
      {game.run.vehicles.length > 0 && (
        <section className="section" aria-labelledby="vehicles-h">
          <h2 id="vehicles-h">Your vehicles</h2>
          <Tips ids={["venues"]} />
          <div className="cards">
            {game.run.vehicles.map((v) => (
              <BuildVehicleCard key={v.uid} game={game} vehicle={v} />
            ))}
          </div>
        </section>
      )}
      {game.run.revealed.includes("build") && (
        <section className="section" aria-labelledby="build-h">
          <h2 id="build-h">Build</h2>
          <Tips ids={["build", "street_stock"]} />
          <p className="sub">Plans you know. Pick parts for each slot; the best fit is chosen for you.</p>
          <div className="cards">
            {blueprints
              .filter((v) => !owned.has(v.id))
              .map((v) => (
                <Blueprint key={v.id} game={game} def={v} />
              ))}
          </div>
          {blueprints.every((v) => owned.has(v.id)) && <p className="empty">You’ve built everything you have plans for. New plans come from winning, studying and better tools.</p>}
        </section>
      )}
      {game.run.revealed.includes("tools") && <PartsCounter game={game} />}
      <SwapMeet game={game} />
    </>
  );
}
