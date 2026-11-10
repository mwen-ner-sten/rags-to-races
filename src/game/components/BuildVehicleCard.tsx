"use client";

import Image from "next/image";
import { useState } from "react";
import { VENUES, getVenue, venueName } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import { reservedPartUids, vehicleBusy, vehicleStats } from "@/core/garage";
import { rawScore } from "@/core/race";
import type { GameState, TuneSetting, Vehicle } from "@/core/types";
import { num } from "../format";
import { vehicleSprite } from "../sprites";
import { useGame } from "../store";
import { BuildSlotRow } from "./BuildSlotRow";

const TUNES: { id: TuneSetting; label: string }[] = [
  { id: "balanced", label: "Balanced" },
  { id: "power", label: "Power (+12% power, −15% reliability)" },
  { id: "reliable", label: "Reliable (+20% reliability, −5% power)" },
];

/** Open venues this tier may enter, lowest first. */
function enterable(game: GameState, tier: number) {
  return VENUES.filter((v) => game.run.venuesOpen.includes(v.id) && tier >= v.tiers[0] && tier <= v.tiers[1]);
}

export function BuildVehicleCard({ game, vehicle }: { game: GameState; vehicle: Vehicle }) {
  const dispatch = useGame((s) => s.dispatch);
  const [picked, setPicked] = useState("");
  const def = getVehicle(vehicle.vehicleId);
  const stats = vehicleStats(vehicle);
  const busy = vehicleBusy(game, vehicle.uid);
  const reserved = reservedPartUids(game);
  const free = game.run.inventory.filter((p) => !reserved.has(p.uid));
  const tuning = game.run.learned.includes("tech:tuning");
  const discipline = game.era?.discipline ?? "dirt";
  const venues = enterable(game, def.tier);
  const venueId = venues.find((v) => v.id === picked)?.id ?? venues[venues.length - 1]?.id;
  const score = rawScore(vehicle, discipline, venueId);
  const facts = [
    ["Power", stats.power],
    ["Handling", stats.handling],
    ["Reliability", stats.reliability],
    ["Weight", stats.weight],
  ] as const;
  return (
    <article className="card vehicle">
      <Image src={vehicleSprite(vehicle.vehicleId)} alt="" width={120} height={80} />
      <div className="card-body">
        <h3>
          {vehicle.name} <span className="muted">{def.name}</span>
        </h3>
        <dl className="facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="num">{num(value)}</dd>
            </div>
          ))}
          <div>
            <dt>{venueId ? `Score at ${venueName(venueId, discipline)}` : "Score"}</dt>
            <dd className="num">{score.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd className="num">
              {vehicle.history.wins}W {vehicle.history.races}R {vehicle.history.dnfs} DNF
            </dd>
          </div>
        </dl>
        {venueId && (
          <div className="build-venue">
            {venues.length > 1 && (
              <label className="inline">
                <span>Racing at</span>
                <select value={venueId} onChange={(e) => setPicked(e.target.value)}>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {venueName(v.id, discipline)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="muted small">{getVenue(venueId).character}</p>
          </div>
        )}
        {busy && <p className="chip">Out racing</p>}
        <div className="slots">
          {def.slots.map((slot) => (
            <BuildSlotRow
              key={slot.slot}
              vehicle={vehicle}
              slot={slot}
              discipline={discipline}
              venueId={venueId}
              free={free}
              busy={busy}
              onInstall={(partUid) => dispatch({ type: "install", vehicleUid: vehicle.uid, slot: slot.slot, partUid })}
              onPull={() => dispatch({ type: "uninstall", vehicleUid: vehicle.uid, slot: slot.slot })}
            />
          ))}
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
