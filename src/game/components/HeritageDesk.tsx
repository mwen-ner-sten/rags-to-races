"use client";
import { useState } from "react";
import { getKnowhow } from "@/core/content/knowhow";
import { getVehicle } from "@/core/content/vehicles";
import { eligibleHistory, exhibitBlocker, heritageClaimBlocker, heritageFit, heritageManual, heritageVenue } from "@/core/heritage";
import type { GameState, HallOfFameEntry } from "@/core/types";
import { RestorationParts } from "./RestorationParts";
import { useGame } from "../store";

export function HeritageOffer({ game, entry }: { game: GameState; entry: HallOfFameEntry }) {
  const dispatch = useGame((s) => s.dispatch);
  if (game.run.heritageProject || !eligibleHistory(game, entry)) return null;
  const archiveIndex = game.meta.hallOfFame.indexOf(entry);
  return <div className="actions">
    <button className="btn small" onClick={() => dispatch({ type: "heritage", move: { type: "start", kind: "exhibit", archiveIndex } })}>Recreate for the museum</button>
    <button className="btn small" onClick={() => dispatch({ type: "heritage", move: { type: "start", kind: "special", archiveIndex } })}>Build a period special</button>
  </div>;
}

export function HeritageDesk({ game, vehicleUid }: { game: GameState; vehicleUid?: string }) {
  const dispatch = useGame((s) => s.dispatch);
  const [uid, setUid] = useState(vehicleUid ?? "");
  const [confirm, setConfirm] = useState("");
  const project = game.run.heritageProject;
  const awards = game.meta.heritageRegister ?? [];
  if (!project && !awards.length) return null;
  const candidates = game.run.vehicles.filter((v) => v.vehicleId === project?.model);
  const car = candidates.find((v) => v.uid === uid) ?? candidates[0];
  const exhibit = project?.kind === "exhibit";
  const issue = project && car && (exhibit ? exhibitBlocker(game, project, car) : heritageFit(project, car));
  return <section className="section" aria-labelledby="heritage-register-h">
    <h2 id="heritage-register-h">Heritage register</h2>
    {project && <>
      <p><strong>{project.originalName}</strong> · Season {project.oldSeason} · {getVehicle(project.model).name}</p>
      {project.completed ? <p>{project.completed} entered the register this Season.</p> : <>
        <p>{exhibit
          ? `Match the original parts, bring each to Worn or better, and finish a shakedown race. Donating the complete car earns access to ${getKnowhow(heritageManual(project.model)).name} in future Seasons.`
          : `Keep an original component model and fit a different one or an extra accessory. Bring each part to Worn or better and podium at the ${heritageVenue(game, project.model)} Feature. This model then qualifies for an early tuning jig.`}</p>
        <RestorationParts game={game} project={project} car={car} />
        {car ? <>
          <label>Inspect garage car <select value={car.uid} onChange={(e) => { setUid(e.target.value); setConfirm(""); }}>{candidates.map((v) => <option key={v.uid} value={v.uid}>{v.name}</option>)}</select></label>
          <p>{issue ?? (exhibit ? "Passed the museum inspection." : "Ready for a Feature podium.")}</p>
          {exhibit && !issue && <>
            <label><input type="checkbox" checked={confirm === car.uid} onChange={(e) => setConfirm(e.target.checked ? car.uid : "")} /> Donate {car.name} and every installed part permanently.</label>
            <button className="btn" disabled={confirm !== car.uid} onClick={() => {dispatch({ type: "heritage", move: { type: "donate", vehicleUid: car.uid } }); setConfirm("");}}>Deliver to museum</button>
          </>}
        </> : <p>Build a {getVehicle(project.model).name} to inspect it here.</p>}
        <button className="link-btn" onClick={() => dispatch({ type: "heritage", move: { type: "cancel" } })}>Release project</button>
      </>}
    </>}
    {!!awards.length && <ul className="plain">{awards.map((award) => {
      const blocked = heritageClaimBlocker(game, award.kind, award.model);
      return <li key={`${award.kind}:${award.model}`}>
        <strong>{award.carName}</strong> · {award.kind === "special" ? "Period special" : "Museum exhibit"} · Season {award.season}
        <p className="small">{award.kind === "special" ? `Tune any ${getVehicle(award.model).name} this Season before learning Tuning.` : `Bring ${getKnowhow(heritageManual(award.model)).name} to the study bench early.`}</p>
        <button className="btn small" disabled={!!blocked} onClick={() => dispatch({ type: "heritage", move: { type: "claim", kind: award.kind, model: award.model } })}>{award.kind === "special" ? "Make jig · 1 Metal, 1 Rubber" : "Print drawings · 12 Scrap Bucks"}</button>
        {blocked && <span className="muted"> {blocked}</span>}
      </li>;
    })}</ul>}
  </section>;
}
