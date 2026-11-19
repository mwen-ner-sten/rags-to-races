"use client";

import { VEHICLES } from "@/core/content/vehicles";
import { useGame } from "../store";
import { Blueprint } from "./BuildBlueprint";
import { BuildVehicleCard } from "./BuildVehicleCard";
import { Tips } from "./Tips";

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
    </>
  );
}
