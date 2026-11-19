"use client";

import { useRef, useState } from "react";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { garageSpace } from "@/core/garage";
import { jobBlocker } from "@/core/jobs";
import { studyMs } from "@/core/knowhowEngine";
import { MOTOR_ROUTES, MOTOR_ROUTE_IDS, motorBookBlocker, motorDuration, motorFitCandidates, motorLodgeBlocker, motorModel, motorPoolVisible, motorReclaimBlocker, motorTenderCandidates, motorWearSlot, type MotorRouteId } from "@/core/motorPool";
import type { GameState, Vehicle } from "@/core/types";
import { conditionName, duration } from "../format";
import { useGame } from "../store";
import { partChoice } from "./BuildSlotRow";
import { ChoiceList } from "./ChoiceList";

function RouteCard({ game, rig, route, onBooked }: { game: GameState; rig: Vehicle; route: MotorRouteId; onBooked: () => void }) {
  const [choice, setChoice] = useState("");
  const dispatch = useGame((state) => state.dispatch);
  const definition = MOTOR_ROUTES[route];
  const tenders = motorTenderCandidates(game, route);
  const stock = tenders.find(({ uid }) => uid === choice) ?? tenders[0];
  const issue = motorBookBlocker(game, route, stock?.uid);
  return <article className="card"><div className="card-body">
    <h3>{definition.name}</h3>
    <p id={`motor-terms-${route}`}>Give one Worn or better {definition.tender} and {definition.cost} Scrap Bucks. Receive a Worn {getPart(definition.reward).name}. Booking commits the fee and part, and the run wears the rig’s {motorWearSlot(rig, route).replace("_", " ")} one step.</p>
    <p>Travel time with {rig.name} · {duration(motorDuration(rig, route))}</p>
    {stock && <ChoiceList id={`motor-tender-${route}`} label="Part to deliver" items={tenders.map((part) => partChoice(part))} value={stock.uid} onChange={setChoice} />}
    {issue && <p className="why">{issue}</p>}
    <button className="btn" type="button" aria-describedby={`motor-terms-${route}`} disabled={!!issue} onClick={() => {
      if (stock && dispatch({ type: "motorPool", move: { type: "book", route, tenderUid: stock.uid } })) onBooked();
    }}>Book {definition.name}</button>
  </div></article>;
}

function Equipment({ game, rig, slot }: { game: GameState; rig: Vehicle; slot: string }) {
  const [choice, setChoice] = useState("");
  const dispatch = useGame((state) => state.dispatch);
  const current = rig.parts[slot];
  const choices = motorFitCandidates(game, slot);
  const selected = choices.find(({ uid }) => uid === choice) ?? choices[0];
  const label = getVehicle(rig.vehicleId).slots.find((entry) => entry.slot === slot)?.label ?? slot;
  if (!current && !selected) return null;
  return <li>
    <p>{label} · {current ? `${conditionName(current.condition)} ${getPart(current.partId).name}` : "Empty"}</p>
    {selected && !game.motorPool?.job && <div className="actions">
      <ChoiceList id={`motor-fit-${slot}`} label={`Replace ${label}`} items={choices.map((part) => partChoice(part))} value={selected.uid} onChange={setChoice} />
      <button className="btn small" type="button" onClick={() => dispatch({ type: "motorPool", move: { type: "fit", slot, partUid: selected.uid } })}>Fit {label}</button>
    </div>}
  </li>;
}

export function MotorPoolPanel({ game, onManageParts }: { game: GameState; onManageParts: () => void }) {
  const dispatch = useGame((state) => state.dispatch);
  const [chosen, setChosen] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const custodyButton = useRef<HTMLButtonElement>(null);
  if (!motorPoolVisible(game)) return null;
  const pool = game.motorPool;
  const custody = pool?.custody;
  const garageRigs = game.run.vehicles.filter(motorModel);
  const selected = garageRigs.find(({ uid }) => uid === chosen) ?? garageRigs[0];
  const lodgeIssue = motorLodgeBlocker(game, selected?.uid ?? "");
  const reclaimIssue = motorReclaimBlocker(game);
  const lodgeKey = selected && `lodge:${selected.uid}`;
  const reclaimKey = custody ? `reclaim:${custody.rig.uid}` : null;
  const plans = "blueprint:service_runabout";
  const study = { kind: "study", knowhowId: plans } as const;
  const studyIssue = jobBlocker(game, study);
  const storageFull = game.run.inventory.length >= garageSpace(game);
  const finishAction = () => {
    setConfirm(null);
    heading.current?.focus();
  };
  const cancelConfirmation = () => {
    setConfirm(null);
    custodyButton.current?.focus();
  };
  return <section className="section" aria-labelledby="motor-pool-heading">
    <h2 id="motor-pool-heading" ref={heading} tabIndex={-1}>County Motor Pool</h2>
    {game.run.available.includes(plans) && <div className="actions">
      <button className="btn" type="button" disabled={!!studyIssue} onClick={() => dispatch({ type: "enqueue", spec: study })}>Study Service Runabout plans · {duration(studyMs(game, plans))}</button>
      {studyIssue && <span className="why">{studyIssue}</span>}
    </div>}
    {!custody ? <>
      <p id="motor-custody-terms">Leave a Riding Mower, Service Runabout, or Beater at the depot. The rig leaves your garage until you complete both routes. Its equipment, wear and race history carry through resets.</p>
      {selected && <ChoiceList id="motor-rig" label="Rig to lodge" compact value={selected.uid}
        items={garageRigs.map((rig) => ({ id: rig.uid, title: rig.name, meta: getVehicle(rig.vehicleId).name }))}
        onChange={(uid) => {setChosen(uid); setConfirm(null);}} />}
      {lodgeIssue && <p className="why">{lodgeIssue}</p>}
      {selected && <button className="btn" ref={custodyButton} type="button" aria-describedby="motor-custody-terms" disabled={!!lodgeIssue} onClick={() => {
        if (confirm !== lodgeKey) setConfirm(lodgeKey ?? null);
        else if (dispatch({ type: "motorPool", move: { type: "lodge", vehicleUid: selected.uid } })) finishAction();
      }}>{confirm === lodgeKey ? `Confirm lodging ${selected.name}` : "Lodge rig at depot"}</button>}
      {confirm === lodgeKey && selected && <button className="btn" type="button" onClick={cancelConfirmation}>Keep in the garage</button>}
    </> : <>
      <p><strong>{custody.rig.name}</strong> is at the depot. {custody.completed.length}/{MOTOR_ROUTE_IDS.length} routes completed. One start per route per Season.</p>
      {pool?.job && <div>
        <p role="status">{MOTOR_ROUTES[pool.job.route].name} delivery underway. Expected return · Worn {getPart(pool.job.part.partId).name}.</p>
        <p>Your fee and trade part stay with the run through a reset.</p>
        <p>{duration(pool.job.remaining)} left</p>
        <progress aria-label="Depot run progress" max={pool.job.duration} value={pool.job.duration - pool.job.remaining} />
      </div>}
      {pool?.claim && <div>
        <p role="status" id={storageFull ? "motor-pickup" : undefined} tabIndex={storageFull ? -1 : undefined}
          aria-describedby={storageFull ? "motor-full-storage" : undefined}>Worn {getPart(pool.claim.part.partId).name} ready for pickup.</p>
        {storageFull && <p className="why" id="motor-full-storage">Free a garage slot to collect. The part stays at the depot through a reset.</p>}
        <div className="actions">
          <button className="btn" id={storageFull ? undefined : "motor-pickup"} type="button" disabled={storageFull} onClick={() => {
            if (dispatch({ type: "motorPool", move: { type: "claim" } })) finishAction();
          }}>Collect depot stock</button>
          {storageFull && <button className="btn" type="button" onClick={onManageParts}>Manage garage parts</button>}
        </div>
      </div>}
      <p>Collect stock from both routes in the same Season to unlock Service Runabout plans and qualify for a Workshop Collective Team Reset with 4 extra Team Points.</p>
      <ul className="plain">{getVehicle(custody.rig.vehicleId).slots.map(({ slot }) => <Equipment game={game} rig={custody.rig} slot={slot} key={slot} />)}</ul>
      {!pool?.job && !pool?.claim && <div className="cards">{MOTOR_ROUTE_IDS.map((route) => <RouteCard game={game} rig={custody.rig} route={route} key={route} onBooked={finishAction} />)}</div>}
      <div className="actions">
        <button className="btn" ref={custodyButton} type="button" disabled={!!reclaimIssue} onClick={() => {
          if (confirm !== reclaimKey) setConfirm(reclaimKey);
          else if (dispatch({ type: "motorPool", move: { type: "reclaim" } })) finishAction();
        }}>{confirm === reclaimKey ? `Confirm return of ${custody.rig.name}` : "Reclaim rig"}</button>
        {confirm === reclaimKey && <button className="btn" type="button" onClick={cancelConfirmation}>Leave at depot</button>}
        {reclaimIssue && <p className="why">{reclaimIssue}</p>}
      </div>
    </>}
  </section>;
}
