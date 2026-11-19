"use client";

import { useState } from "react";
import { venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { WORKS_FAMILIES, WORKS_FAMILY_IDS, WORKS_MAX_ATTEMPTS, trialEntry, worksEnterBlocker, worksEntryStatus, worksFit, worksRecastBlocker, worksReport, worksSignBlocker, worksStock, type WorksDeal, type WorksFamily, type WorksTest } from "@/core/manufacturer";
import type { GameState } from "@/core/types";
import { capitalize, ordinal } from "../format";
import { useGame } from "../store";
import { ChoiceList } from "./ChoiceList";
import { partChoice } from "./BuildSlotRow";

function DrawingTerms({ id }: { id: WorksFamily }) {
  const { drawing } = WORKS_FAMILIES[id];
  const input = getPart(drawing.input);
  const output = getPart(drawing.output);
  return <>
    <p>{input.name} + {drawing.units} {drawing.material} + {drawing.cash} Scrap Bucks → {output.name}. Keeps the input part’s condition.</p>
    <p className="muted">Power {input.power}→{output.power} · Handling {input.handling}→{output.handling} · Reliability {input.reliability}→{output.reliability} · Weight {input.weight}→{output.weight}</p>
  </>;
}

export function WorksDrawingPicker({ game, value, onChange }: { game: GameState; value?: WorksFamily; onChange: (family: WorksFamily | undefined) => void }) {
  const drawings = game.manufacturer?.drawings ?? [];
  if (!drawings.length) return null;
  return <fieldset>
    <legend>Works drawing (optional)</legend>
    <label className="check"><input type="radio" name="works-drawing" checked={!value} onChange={() => onChange(undefined)} /> No works drawing</label>
    {drawings.map((id) => <div key={id} className="row-card">
      <label className="check"><input type="radio" name="works-drawing" checked={value === id} onChange={() => onChange(id)} /> {WORKS_FAMILIES[id].name}</label>
      <DrawingTerms id={id} />
    </div>)}
    <p className="hint">Choose one drawing for one conversion this Season. It uses a free workshop part. Your donor and Club loan stay available for assembly.</p>
  </fieldset>;
}

export function WorksDrawingWorkshop({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const [choice, setChoice] = useState("");
  const id = game.config.worksPlan;
  if (!id) return null;
  const used = game.manufacturer?.usedDrawingSeason === game.meta.seasonsPlayed + 1;
  const candidates = game.run.inventory.filter((part) => worksStock(part, id));
  const selected = candidates.find(({ uid }) => uid === choice) ?? candidates[0];
  const blocker = worksRecastBlocker(game, selected?.uid);
  return <section className="section" aria-labelledby="works-workshop-h">
    <h2 id="works-workshop-h">{WORKS_FAMILIES[id].name} drawing</h2>
    <DrawingTerms id={id} />
    {used ? <p role="status">Drawing used this Season.</p> : <>
      {candidates.length > 0 && selected && <ChoiceList id="works-stock" label="Workshop stock" items={candidates.map((stock) => partChoice(stock))} value={selected.uid} onChange={setChoice} />}
      {blocker && <p className="why">{blocker}</p>}
      <button className="btn primary" type="button" disabled={!!blocker} onClick={() => {
        if (selected) dispatch({ type: "works", move: { type: "recast", partUid: selected.uid } });
      }}>Recast workshop part</button>
    </>}
  </section>;
}

function TrialTerms({ trial, game }: { trial: WorksTest; game: GameState }) {
  return <>{venueName(trial.venue, game.era?.discipline ?? "dirt")} {capitalize(trial.event)} · {capitalize(trial.call)} · {trial.place ? "Podium" : "Finish"}
    {trial.wearLimit !== undefined && ` · At most ${trial.wearLimit} condition step lost`} · {trialEntry(trial)} Scrap Bucks</>;
}

function Offer({ game, id }: { game: GameState; id: WorksFamily }) {
  const dispatch = useGame((s) => s.dispatch);
  const [choice, setChoice] = useState("");
  const family = WORKS_FAMILIES[id];
  const cars = game.run.vehicles.filter(({ vehicleId }) => vehicleId === "go_kart");
  const selected = cars.find(({ uid }) => uid === choice) ?? cars.find((car) => worksFit(car, id) >= 3) ?? cars[0];
  const blocked = worksSignBlocker(game, id, selected);
  return <article className="card"><div className="card-body">
    <h3>{family.name}</h3>
    <p>{family.principles} Your named Go-Kart keeps its signed engine and at least three family parts.</p>
    <details><summary>Family parts</summary><p>{family.parts.map((partId) => getPart(partId).name).join(" · ")}</p></details>
    <ol className="plain">{family.tests.map((trial) => <li key={trial.venue}><TrialTerms trial={trial} game={game} /></li>)}</ol>
    <p>{family.fee} Scrap Bucks inspection fee · {family.budget} trial budget · up to {WORKS_MAX_ATTEMPTS} starts.</p>
    {cars.length > 0 && selected && <ChoiceList id={`works-article-${id}`} label="Proof article" value={selected.uid} onChange={setChoice}
      items={cars.map((car) => ({ id: car.uid, title: car.name, meta: `${worksFit(car, id)} family parts` }))} />}
    {blocked && <p className="why">{blocked}</p>}
    <button className="btn primary" type="button" disabled={!!blocked} onClick={() => {
      if (selected) dispatch({ type: "works", move: { type: "sign", family: id, vehicleUid: selected.uid } });
    }}>Sign {family.name} deal</button>
  </div></article>;
}

function Deal({ game, deal }: { game: GameState; deal: WorksDeal }) {
  const dispatch = useGame((s) => s.dispatch);
  const [confirm, setConfirm] = useState(false);
  const family = WORKS_FAMILIES[deal.family];
  const report = worksReport(deal);
  const status = worksEntryStatus(game);
  const blocker = worksEnterBlocker(game);
  return <section className="section" aria-labelledby="works-deal-h">
    <h3 id="works-deal-h">{family.name} · {deal.article}</h3>
    <p>{report.step}/{family.tests.length} benchmarks passed · {deal.attempts.length}/{WORKS_MAX_ATTEMPTS} starts · {report.spent}/{family.budget} Scrap Bucks spent</p>
    <ol className="plain">{deal.attempts.map((attempt) => <li key={attempt.raceId}>
      {venueName(family.tests[attempt.step].venue, game.era?.discipline ?? "dirt")} · {attempt.dnf ? "Did not finish" : ordinal(attempt.position)} · {attempt.wear} condition steps lost · {attempt.passed ? "Passed" : "Missed target"}
    </li>)}</ol>
    {report.homologated && <p role="status">Homologated. The manufacturer paid {family.grant} Scrap Bucks. Select the drawing at a future Scrap Reset.</p>}
    {report.failed && <p role="status">The deal ran out of starts or entry budget before the article passed both tests.</p>}
    {!report.failed && report.next && <>
      <p>Next benchmark · <TrialTerms trial={report.next} game={game} /></p>
      <button className="btn primary" type="button" disabled={!!blocker} onClick={() => dispatch({ type: "works", move: { type: "enter" } })}>Sign up for works trial</button>
      {status ? <p role="status">{status === "queued" ? "Signed up in the race queue. Fit the signed engine and three family parts before the start." : "On track."}</p> : blocker && <p className="why">{blocker}</p>}
    </>}
    {!status && <button className="btn" type="button" onClick={() => {
      if (report.homologated || report.failed || confirm) dispatch({ type: "works", move: { type: "archive" } });
      else setConfirm(true);
    }}>{report.homologated || report.failed ? "File works report" : confirm ? "Retire deal and file results" : "Retire deal"}</button>}
  </section>;
}

export function ManufacturerPanel() {
  const game = useGame((s) => s.game);
  const works = game?.manufacturer;
  if (!game || !works?.invites.length) return null;
  return <div className="panel">
    <header className="section"><h2 id="manufacturer-h">Manufacturer</h2><p>Commission a physical article from your garage. Standard races, Club and Owner routes stay available during the deal.</p></header>
    {works.active ? <Deal key={works.active.id} game={game} deal={works.active} /> : <section className="section" aria-labelledby="works-offers-h">
      <h3 id="works-offers-h">Works offers</h3>
      <div className="cards">{WORKS_FAMILY_IDS.filter((id) => works.invites.includes(id)).map((id) => <Offer game={game} id={id} key={id} />)}</div>
    </section>}
    {works.drawings.length > 0 && <section className="section" aria-labelledby="works-drawings-h">
      <h3 id="works-drawings-h">Earned drawings</h3><ul>{works.drawings.map((id) => <li key={id}><strong>{WORKS_FAMILIES[id].name}</strong><DrawingTerms id={id} /></li>)}</ul>
    </section>}
    {works.history.length > 0 && <section className="section" aria-labelledby="works-history-h">
      <h3 id="works-history-h">Homologation records</h3><ul>{works.history.map((past) => (
        <li key={past.id}>Season {past.season} · {past.article} · {WORKS_FAMILIES[past.family].name} · {capitalize(past.status)}</li>
      ))}</ul>
    </section>}
  </div>;
}
