"use client";
import { useState } from "react";
import { getVehicle } from "@/core/content/vehicles";
import { eligibleHistory, exhibitBlocker, heritageFit, heritageVenue } from "@/core/heritage";
import type { GameState } from "@/core/types";
import { RestorationParts } from "./RestorationParts";
import { useGame } from "../store";
import { ChoiceList } from "./ChoiceList";

export function HeritageDesk({ game, vehicleUid }: { game: GameState; vehicleUid?: string }) {
  const dispatch = useGame((s) => s.dispatch);
  const [uid, setUid] = useState(vehicleUid ?? "");
  const [confirm, setConfirm] = useState("");
  const project = game.run.heritageProject;
  const [pickedArchive, setPickedArchive] = useState("");
  const history = project ? [] : game.meta.hallOfFame.map((entry, index) => ({ entry, index })).reverse()
    .filter(({ entry }) => eligibleHistory(game, entry));
  const selected = history.find(({ index }) => String(index) === pickedArchive) ?? history[0];
  const candidates = game.run.vehicles.filter((v) => v.vehicleId === project?.model);
  const car = candidates.find((v) => v.uid === uid) ?? candidates[0];
  const exhibit = project?.kind === "exhibit";
  const issue = project && car && (exhibit ? exhibitBlocker(game, project, car) : heritageFit(project, car));
  return <section className="section" aria-labelledby="heritage-register-h">
    <h2 id="heritage-register-h">Heritage register</h2>
    {selected && <>
      <label className="archive-field">Archived racer
        <select value={selected.index} onChange={(event) => setPickedArchive(event.target.value)}>
          {history.map(({ entry, index }) => <option key={index} value={index}>{entry.name} · Season {entry.season} · {getVehicle(entry.vehicleId).name} · {entry.history.wins} wins</option>)}
        </select>
      </label>
      <p>Choose one tribute this Season. Each model has one permanent display in the Hall of Fame.</p>
      <div className="actions">
        <button className="btn small" onClick={() => dispatch({ type: "heritage", move: { type: "start", kind: "exhibit", archiveIndex: selected.index } })}>Recreate for the museum</button>
        <button className="btn small" onClick={() => dispatch({ type: "heritage", move: { type: "start", kind: "special", archiveIndex: selected.index } })}>Build a period special</button>
      </div>
      <p className="small">Donate a faithful rebuild after a shakedown, or keep a modified racer and earn its display with a Feature podium.</p>
    </>}
    {project && <>
      <p><strong>{project.originalName}</strong> · Season {project.oldSeason} · {getVehicle(project.model).name}</p>
      {project.completed ? <p>{project.completed} entered the register this Season. Its display is in the Hall of Fame.</p> : <>
        <p>{exhibit
          ? `Match the original parts, bring each to Worn or better, and finish a shakedown race. Donate the complete car to dedicate this model’s display.`
          : `Keep an original component model and fit a different one or an extra accessory. Bring each part to Worn or better and podium at the ${heritageVenue(game, project.model)} Feature. The racer stays in your garage and earns this model’s display.`}</p>
        <RestorationParts game={game} project={project} car={car} />
        {car ? <>
          <ChoiceList label="Inspect garage car" value={car.uid} items={candidates.map((v) => ({ id: v.uid, title: v.name }))} onChange={(next) => { setUid(next); setConfirm(""); }} />
          <p>{issue ?? (exhibit ? "Passed the museum inspection." : "Ready for a Feature podium.")}</p>
          {exhibit && !issue && <>
            <label><input type="checkbox" checked={confirm === car.uid} onChange={(e) => setConfirm(e.target.checked ? car.uid : "")} /> Donate {car.name} and every installed part permanently.</label>
            <button className="btn" title={confirm !== car.uid ? "Confirm the permanent donation first." : undefined} disabled={confirm !== car.uid} onClick={() => {dispatch({ type: "heritage", move: { type: "donate", vehicleUid: car.uid } }); setConfirm("");}}>Deliver to museum</button>
          </>}
        </> : <p>Build a {getVehicle(project.model).name} to inspect it here.</p>}
        <button className="link-btn" onClick={() => dispatch({ type: "heritage", move: { type: "cancel" } })}>Release project</button>
      </>}
    </>}
  </section>;
}
