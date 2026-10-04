"use client";

import Image from "next/image";
import { useState } from "react";
import { counterBlocker } from "@/core/actions";
import { DISCIPLINES } from "@/core/content/events";
import { PARTS, getPart } from "@/core/content/parts";
import { VEHICLES, getVehicle, type VehicleDef } from "@/core/content/vehicles";
import { counterPrice, reservedPartUids, vehicleBusy, vehicleStats } from "@/core/garage";
import { jobBlocker } from "@/core/jobs";
import { rawScore } from "@/core/race";
import type { GameState, PartInstance, TuneSetting, Vehicle } from "@/core/types";
import { conditionName, num } from "../format";
import { vehicleSprite } from "../sprites";
import { useGame } from "../store";

function score(game: GameState, part: PartInstance): number {
  const def = getPart(part.partId);
  const w = DISCIPLINES[game.era?.discipline ?? "dirt"].weights;
  const m = [0.4, 0.6, 0.8, 1, 1.15][part.condition];
  return (def.power * w.power + def.handling * w.handling + def.reliability * w.reliability) * m - def.weight * w.weight;
}

function partOption(part: PartInstance): string {
  return `${getPart(part.partId).name} (${conditionName(part.condition)})`;
}

function Blueprint({ game, def }: { game: GameState; def: VehicleDef }) {
  const dispatch = useGame((s) => s.dispatch);
  const reserved = reservedPartUids(game);
  const free = game.run.inventory.filter((p) => !reserved.has(p.uid));
  const best = (slot: VehicleDef["slots"][number], used: Set<string>) =>
    free
      .filter((p) => slot.accepts.includes(p.partId) && !used.has(p.uid) && p.condition > 0 && (slot.minCondition === undefined || p.condition >= slot.minCondition))
      .sort((a, b) => score(game, b) - score(game, a))[0];
  const [picks, setPicks] = useState<Record<string, string>>({});
  const used = new Set<string>();
  const chosen: Record<string, string> = {};
  for (const slot of def.slots) {
    const picked = picks[slot.slot];
    const uid = picked !== undefined ? picked : best(slot, used)?.uid ?? "";
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
          <button className="btn primary" disabled={!!blocker} onClick={() => dispatch({ type: "enqueue", spec })}>
            Assemble{def.cash ? ` · ${num(def.cash)} SB` : ""}
            {mats.length ? ` + ${mats.join(", ")}` : ""}
          </button>
          {blocker && <span className="why">{blocker}</span>}
        </div>
      </div>
    </article>
  );
}

const TUNES: { id: TuneSetting; label: string }[] = [
  { id: "balanced", label: "Balanced" },
  { id: "power", label: "Power (+12% power, −15% reliability)" },
  { id: "reliable", label: "Reliable (+20% reliability, −5% power)" },
];

function VehicleCard({ game, vehicle }: { game: GameState; vehicle: Vehicle }) {
  const dispatch = useGame((s) => s.dispatch);
  const def = getVehicle(vehicle.vehicleId);
  const stats = vehicleStats(vehicle);
  const busy = vehicleBusy(game, vehicle.uid);
  const reserved = reservedPartUids(game);
  const tuning = game.run.learned.includes("tech:tuning");
  return (
    <article className="card vehicle">
      <Image src={vehicleSprite(vehicle.vehicleId)} alt="" width={120} height={80} />
      <div className="card-body">
        <h3>
          {vehicle.name} <span className="muted">{def.name}</span>
        </h3>
        <dl className="facts">
          <div>
            <dt>Power</dt>
            <dd className="num">{num(stats.power)}</dd>
          </div>
          <div>
            <dt>Handling</dt>
            <dd className="num">{num(stats.handling)}</dd>
          </div>
          <div>
            <dt>Reliability</dt>
            <dd className="num">{num(stats.reliability)}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd className="num">{num(stats.weight)}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd className="num">{rawScore(vehicle, game.era?.discipline ?? "dirt").toFixed(1)}</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd className="num">
              {vehicle.history.wins}W {vehicle.history.races}R {vehicle.history.dnfs} DNF
            </dd>
          </div>
        </dl>
        {busy && <p className="chip">Out racing</p>}
        <div className="slots">
          {def.slots.map((slot) => {
            const installed = vehicle.parts[slot.slot];
            const options = game.run.inventory.filter((p) => !reserved.has(p.uid) && slot.accepts.includes(p.partId) && (slot.minCondition === undefined || p.condition >= slot.minCondition));
            return (
              <div key={slot.slot} className="slot">
                <span className="slot-name">{slot.slot}</span>
                <span className="slot-part">
                  {installed ? (
                    <>
                      {getPart(installed.partId).name} <span className={`cond c${installed.condition}`}>{conditionName(installed.condition)}</span>
                    </>
                  ) : (
                    <span className="why">Empty{slot.required ? ". It can't race" : ""}</span>
                  )}
                </span>
                {!busy && (
                  <span className="slot-actions">
                    {options.length > 0 && (
                      <select aria-label={`Swap ${slot.slot}`} value="" onChange={(e) => e.target.value && dispatch({ type: "install", vehicleUid: vehicle.uid, slot: slot.slot, partUid: e.target.value })}>
                        <option value="">Swap in…</option>
                        {options.map((p) => (
                          <option key={p.uid} value={p.uid}>
                            {partOption(p)}
                          </option>
                        ))}
                      </select>
                    )}
                    {installed && (
                      <button className="link-btn" onClick={() => dispatch({ type: "uninstall", vehicleUid: vehicle.uid, slot: slot.slot })}>
                        Pull
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <label className="inline">
          <span>Tune</span>
          <select value={vehicle.tune} disabled={!tuning} onChange={(e) => dispatch({ type: "setTune", vehicleUid: vehicle.uid, tune: e.target.value as TuneSetting })}>
            {TUNES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {!tuning && <span className="why">Learn Tuning</span>}
        </label>
      </div>
    </article>
  );
}

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
            <button className="btn small" disabled={!!counterBlocker(game, p.id)} onClick={() => dispatch({ type: "buyPart", partId: p.id })}>
              {num(counterPrice(p.id))} SB
            </button>
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
          <div className="cards">
            {game.run.vehicles.map((v) => (
              <VehicleCard key={v.uid} game={game} vehicle={v} />
            ))}
          </div>
        </section>
      )}
      {game.run.revealed.includes("build") && (
        <section className="section" aria-labelledby="build-h">
          <h2 id="build-h">Build</h2>
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
    </>
  );
}
