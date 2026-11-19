"use client";

import Image from "next/image";
import { SeasonLog } from "./SeasonLog";
import { RallyCards } from "./RallyCards";
import { HeritageOffer } from "./HeritageDesk";
import type { CareerDestination } from "@/core/careerAdvice";
import { useState } from "react";
import { SubNav } from "./SubNav";
import { RIVALS, venueName } from "@/core/content/events";
import { PARTS, getPart } from "@/core/content/parts";
import { PLACES } from "@/core/content/places";
import { getVehicle } from "@/core/content/vehicles";
import type { GameState } from "@/core/types";
import { conditionName, num, seasonClock } from "../format";
import { partOriginLabel } from "@/core/provenance";
import { useGame } from "../store";
import { partSprite, vehicleSprite } from "../sprites";
import { Tips } from "./Tips";

function Codex({ game }: { game: GameState }) {
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const seen = PARTS.filter((part) => (game.meta.codex.parts[part.id] ?? 0) > 0);
  const matches = seen.filter((part) => (part.name + " " + part.category).toLowerCase().includes(filter.trim().toLowerCase()));
  const selected = matches.find((part) => part.id === selectedId) ?? matches[0];
  const sources = selected ? PLACES.filter((place) => game.meta.codex.places[place.id] && place.finds.some((find) => find.partId === selected.id)) : [];
  return (
    <div className="codex">
      <h3 className="label">Parts seen</h3>
      {seen.length === 0 && <p className="empty">Parts you find on trips are written up here.</p>}
      {seen.length > 0 && <>
        <label className="archive-field">Find a part
          <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Part name or category" />
        </label>
        {selected ? <>
          <label className="archive-field">Discovered part
            <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {matches.map((part) => <option key={part.id} value={part.id}>{part.name}</option>)}
            </select>
          </label>
          <article className="part-study">
            <Image src={partSprite(selected.id)} width={144} height={144} alt={selected.name} />
            <div>
              <h4>{selected.name}</h4>
              <p>{selected.blurb}</p>
              <p className="num">Tier {selected.tier} · Seen {num(game.meta.codex.parts[selected.id])}×</p>
              <p>Power {selected.power} · Handling {selected.handling} · Reliability {selected.reliability} · Weight {selected.weight}</p>
              {sources.length > 0 && <p>Found at {sources.map((place) => place.name).join(", ")}.</p>}
            </div>
          </article>
        </> : <p role="status">No discovered parts match this search.</p>}
      </>}
    </div>
  );
}

function Rivals({ game }: { game: GameState }) {
  const watch = useGame((store) => store.showReplay);
  return (
    <ul className="plain">
      {RIVALS.map((r) => {
        const rec = game.meta.rivals[r.id];
        const meetings = game.run.races.filter((race) => race.rival?.id === r.id).slice(-5).reverse();
        return (
          <li key={r.id}>
            <strong>{r.name}</strong> <span className="muted">{r.line}</span>
            <p className="blurb">{r.style}</p>
            <div className="num">{rec ? `${rec.wins} beaten · ${rec.losses} lost` : "Not met yet"}</div>
            {meetings.length > 0 && <details>
              <summary>Recent meetings this season ({meetings.length})</summary>
              <ul className="plain">
                {meetings.map((race) => <li key={race.id}>
                  {venueName(race.venueId, game.era?.discipline ?? "dirt")} · {seasonClock(race.seasonMs)} · {race.rival?.beaten ? "Won" : "Lost"}{" "}
                  <button className="link-btn" onClick={() => watch(race)}>Watch meeting</button>
                </li>)}
              </ul>
            </details>}
          </li>
        );
      })}
    </ul>
  );
}

function HallOfFame({ game, onOpen }: { game: GameState; onOpen?: (target: CareerDestination) => void }) {
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(12);
  if (!game.meta.hallOfFame.length) return <p className="empty">Vehicles appear here after retirement or at the end of a Season.</p>;
  const query = filter.trim().toLowerCase();
  const entries = [...game.meta.hallOfFame].reverse().filter((entry) =>
    `${entry.name} ${getVehicle(entry.vehicleId).name} Season ${entry.season}`.toLowerCase().includes(query)
  );
  return <>
    {game.run.heritageProject && <div className="notice" role="status">
      <p>{game.run.heritageProject.originalName} is being {game.run.heritageProject.kind === "exhibit" ? "recreated" : "rebuilt as a period special"}. Work on it in the Workshop, under Heritage.</p>
      {onOpen && <button className="btn small" onClick={() => onOpen({ tab: "workshop", section: "Heritage" })}>Open Heritage in the Workshop</button>}
    </div>}
    <label className="archive-field">Find a retired vehicle
      <input type="search" value={filter} onChange={(event) => { setFilter(event.target.value); setLimit(12); }} placeholder="Name, model or season" />
    </label>
    {!entries.length && <p role="status">No retired vehicles match.</p>}
    <ul className="plain hof">
      {entries.slice(0, limit).map((entry, index) => <li key={`${entry.season}-${index}-${entry.name}`}>
        <details>
          <summary>
            <Image src={vehicleSprite(entry.vehicleId)} alt="" width={48} height={32} />
            <strong>{entry.name}</strong> · Season {entry.season} · {getVehicle(entry.vehicleId).name}
          </summary>
          <p>{entry.history.wins} wins from {entry.history.races} races · {entry.history.dnfs} DNF</p>
          {entry.retirement && <p>{{exchange:"Traded at the mower exchange", dismantle:"Dismantled for parts", exhibit:"Donated to the museum"}[entry.retirement.kind]} · {seasonClock(entry.retirement.seasonMs)}</p>}
          <ul className="plain">{entry.parts.map((part) => <li key={part.slot}>
            <strong>{getPart(part.partId).name}</strong> · {conditionName(part.condition)} · {partOriginLabel(part)}
          </li>)}</ul>
          <HeritageOffer game={game} entry={entry} />
        </details>
      </li>)}
    </ul>
    {entries.length > limit && <button className="btn" onClick={() => setLimit(limit + 12)}>Show older vehicles</button>}
  </>;
}

function Journal({ game }: { game: GameState }) {
  const [season, setSeason] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const entries = [...game.meta.journal].reverse();
  const seasons = [...new Set(entries.map((entry) => entry.season))];
  const matching = entries.filter((entry) => (!season || entry.season === Number(season)) && entry.text.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="archive-filters">
      <label className="archive-field">Season
        <select value={season} onChange={(event) => { setSeason(event.target.value); setLimit(30); }}>
          <option value="">All seasons</option>
          {seasons.map((n) => <option key={n} value={n}>Season {n}</option>)}
        </select>
      </label>
      <label className="archive-field">Search journal
        <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(30); }} />
      </label>
    </div>
    <ol className="journal">
      {matching.slice(0, limit).map((entry, index) => <li key={`${entry.id}-${index}`}>
        <span className="when muted">Season {entry.season} · {seasonClock(entry.seasonMs)}</span>
        <p>{entry.text}</p>
      </li>)}
    </ol>
    {!matching.length && <p role="status">No matching journal entries.</p>}
    {matching.length > limit && <button className="btn" onClick={() => setLimit(limit + 30)}>Read older entries</button>}
  </>;
}

const SECTIONS = ["Journal", "Codex", "Rivals", "Hall of Fame", "Seasons", "Timecards"] as const;

export function NotebookPanel({ section, onOpen }: { section?: "Hall of Fame" | "Timecards"; onOpen?: (target: CareerDestination) => void }) {
  const game = useGame((s) => s.game);
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>(section ?? "Journal");
  if (!game) return null;
  const sections = SECTIONS.filter((name) => name !== "Timecards" || game.era?.discipline === "rally" || !!game.meta.rallyCards?.length);
  return (
    <section className="section" aria-labelledby="notebook-h">
      <h2 id="notebook-h">Notebook</h2>
      <Tips ids={["codex"]} />
      <SubNav idPrefix="nb" label="Notebook sections" items={sections.map((id) => ({ id, label: id }))} value={tab} onChange={setTab} />
      <div role="tabpanel" id="nb-panel" aria-labelledby={`nb-tab-${tab}`}>
      {tab === "Journal" && <Journal game={game} />}
      {tab === "Codex" && <Codex game={game} />}
      {tab === "Rivals" && <Rivals game={game} />}
      {tab === "Hall of Fame" && <HallOfFame game={game} onOpen={onOpen} />}
      {tab === "Seasons" && <SeasonLog log={game.meta.seasonLog ?? []} contacts={game.countyRivals} />}
      {tab === "Timecards" && <RallyCards cards={game.meta.rallyCards ?? []} />}
      </div>
    </section>
  );
}
