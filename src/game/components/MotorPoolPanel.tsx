"use client";

import { useState } from "react";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { garageSpace } from "@/core/garage";
import { MOTOR_ROUTES, MOTOR_ROUTE_IDS, motorBookBlocker, motorDuration, motorFitCandidates, motorLodgeBlocker, motorModel, motorPoolVisible, motorReclaimBlocker, motorTenderCandidates, type MotorRouteId } from "@/core/motorPool";
import { partOriginLabel } from "@/core/provenance";
import type { GameState, Vehicle } from "@/core/types";
import { conditionName, duration } from "../format";
import { useGame } from "../store";

function RouteCard({ game, rig, route }: { game: GameState; rig: Vehicle; route: MotorRouteId }) {
  const [choice, setChoice] = useState("");
  const dispatch = useGame((state) => state.dispatch);
  const definition = MOTOR_ROUTES[route];
  const tenders = motorTenderCandidates(game, route);
  const stock = tenders.find(({ uid }) => uid === choice) ?? tenders[0];
  const issue = motorBookBlocker(game, route, stock?.uid);
  return <article className="card"><div className="card-body">
    <h3>{definition.name}</h3>
    <p>Give one Worn or better {definition.tender} and {definition.cost} Scrap Bucks. Receive a Worn {getPart(definition.reward).name}. This run wears the rig’s {definition.wear} one step.</p>
    <p>Travel time with {rig.name} · {duration(motorDuration(rig, route))}</p>
    {stock && <label className="inline" htmlFor={`motor-tender-${route}`}>Part to deliver
      <select id={`motor-tender-${route}`} value={stock.uid} onChange={(event) => setChoice(event.target.value)}>
        {tenders.map((part) => <option key={part.uid} value={part.uid}>{conditionName(part.condition)} {getPart(part.partId).name} · {partOriginLabel(part)}</option>)}
      </select>
    </label>}
    {issue && <p className="why">{issue}</p>}
    <button className="btn" type="button" disabled={!!issue} onClick={() => {
      if (stock) dispatch({ type: "motorPool", move: { type: "book", route, tenderUid: stock.uid } });
    }}>Book {definition.name}</button>
  </div></article>;
}

function Equipment({ game, rig, slot }: { game: GameState; rig: Vehicle; slot: string }) {
  const [choice, setChoice] = useState("");
  const dispatch = useGame((state) => state.dispatch);
  const current = rig.parts[slot];
  const choices = motorFitCandidates(game, slot);
  const selected = choices.find(({ uid }) => uid === choice) ?? choices[0];
  if (!current && !selected) return null;
  return <li>
    <p>{slot} · {current ? `${conditionName(current.condition)} ${getPart(current.partId).name}` : "Empty"}</p>
    {selected && !game.motorPool?.job && <div className="actions">
      <label className="inline" htmlFor={`motor-fit-${slot}`}>Replace {slot}
        <select id={`motor-fit-${slot}`} value={selected.uid} onChange={(event) => setChoice(event.target.value)}>
          {choices.map((part) => <option value={part.uid} key={part.uid}>{conditionName(part.condition)} {getPart(part.partId).name} · {partOriginLabel(part)}</option>)}
        </select>
      </label>
      <button className="btn small" type="button" onClick={() => dispatch({ type: "motorPool", move: { type: "fit", slot, partUid: selected.uid } })}>Fit {slot}</button>
    </div>}
  </li>;
}

export function MotorPoolPanel({ game }: { game: GameState }) {
  const dispatch = useGame((state) => state.dispatch);
  const [chosen, setChosen] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!motorPoolVisible(game)) return null;
  const pool = game.motorPool;
  const custody = pool?.custody;
  const garageRigs = game.run.vehicles.filter(motorModel);
  const selected = garageRigs.find(({ uid }) => uid === chosen) ?? garageRigs[0];
  const lodgeIssue = motorLodgeBlocker(game, selected?.uid ?? "");
  const reclaimIssue = motorReclaimBlocker(game);
  const lodgeKey = selected && `lodge:${selected.uid}`;
  const reclaimKey = custody ? `reclaim:${custody.rig.uid}` : null;
  return <section className="section" aria-labelledby="motor-pool-heading">
    <h2 id="motor-pool-heading">County Motor Pool</h2>
    {!custody ? <>
      <p>Leave one Riding Mower or Beater at the depot to run deliveries while your main garage works. It leaves your garage, and its equipment, wear and race history carry through resets.</p>
      {selected && <label className="inline" htmlFor="motor-rig">Rig to lodge
        <select id="motor-rig" value={selected.uid} onChange={(event) => {setChosen(event.target.value); setConfirm(null);}}>
          {garageRigs.map((rig) => <option value={rig.uid} key={rig.uid}>{rig.name} · {getVehicle(rig.vehicleId).name}</option>)}
        </select>
      </label>}
      {lodgeIssue && <p className="why">{lodgeIssue}</p>}
      {selected && <button className="btn" type="button" disabled={!!lodgeIssue} onClick={() => {
        if (confirm !== lodgeKey) setConfirm(lodgeKey ?? null);
        else if (dispatch({ type: "motorPool", move: { type: "lodge", vehicleUid: selected.uid } })) setConfirm(null);
      }}>{confirm === lodgeKey ? `Confirm lodging ${selected.name}` : "Lodge rig at depot"}</button>}
      {confirm === lodgeKey && selected && <button className="btn" type="button" onClick={() => setConfirm(null)}>Keep in the garage</button>}
    </> : <>
      <p><strong>{custody.rig.name}</strong> is at the depot. {custody.completed.length}/{MOTOR_ROUTE_IDS.length} routes completed. One start per route per Season.</p>
      <p>Collect stock from both routes in the same Season to qualify for a Workshop Collective Team Reset with 4 extra Team Points.</p>
      <ul className="plain">{getVehicle(custody.rig.vehicleId).slots.map(({ slot }) => <Equipment game={game} rig={custody.rig} slot={slot} key={slot} />)}</ul>
      {pool?.job ? <div role="status">
        <p>{MOTOR_ROUTES[pool.job.route].name} · {duration(pool.job.remaining)} left. The run continues through a reset.</p>
        <progress aria-label="Depot run progress" max={pool.job.duration} value={pool.job.duration - pool.job.remaining} />
      </div> : pool?.claim ? <div>
        <p role="status">Worn {getPart(pool.claim.part.partId).name} ready for pickup.</p>
        <button className="btn" type="button" disabled={game.run.inventory.length >= garageSpace(game)} onClick={() => dispatch({ type: "motorPool", move: { type: "claim" } })}>Collect depot stock</button>
        {game.run.inventory.length >= garageSpace(game) && <p className="why">Free a garage slot for the depot stock.</p>}
      </div> : <div className="cards">{MOTOR_ROUTE_IDS.map((route) => <RouteCard game={game} rig={custody.rig} route={route} key={route} />)}</div>}
      <div className="actions">
        <button className="btn" type="button" disabled={!!reclaimIssue} onClick={() => {
          if (confirm !== reclaimKey) setConfirm(reclaimKey);
          else if (dispatch({ type: "motorPool", move: { type: "reclaim" } })) setConfirm(null);
        }}>{confirm === reclaimKey ? `Confirm return of ${custody.rig.name}` : "Reclaim rig"}</button>
        {confirm === reclaimKey && <button className="btn" type="button" onClick={() => setConfirm(null)}>Leave at depot</button>}
        {reclaimIssue && <p className="why">{reclaimIssue}</p>}
      </div>
    </>}
  </section>;
}
