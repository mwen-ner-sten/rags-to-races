"use client";

import Image from "next/image";
import { SeasonLog } from "./SeasonLog";
import { RallyCards } from "./RallyCards";
import { HeritageDesk, HeritageOffer } from "./HeritageDesk";
import { useState, type KeyboardEvent } from "react";
import { RIVALS, venueName } from "@/core/content/events";
import { KNOWHOW } from "@/core/content/knowhow";
import { PARTS, getPart } from "@/core/content/parts";
import { PLACES, codexLevel, CODEX_LEVELS } from "@/core/content/places";
import { getVehicle } from "@/core/content/vehicles";
import { habitThreshold } from "@/core/habits";
import { jobBlocker } from "@/core/jobs";
import { knowhowTier, studyMs } from "@/core/knowhowEngine";
import type { GameState } from "@/core/types";
import { conditionName, duration, num, seasonClock } from "../format";
import { partOriginLabel } from "@/core/provenance";
import { habitLabel } from "../labels";
import { useGame } from "../store";
import { partSprite, vehicleSprite } from "../sprites";
import { Tips } from "./Tips";

const TIER_TEXT = { learning: "Learning", familiar: "Familiar", second_nature: "Second Nature" } as const;

function KnowhowList({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const rows = KNOWHOW.filter((k) => k.kind !== "place");
  return (
    <div>
      <p className="sub">
        The first time, you work it out yourself: a long study job. Next Season it’s Familiar and takes a quarter of the time. After three Seasons it’s Second Nature and you just know it when the moment comes.
      </p>
      <ul className="knowhow">
        {rows.map((k) => {
          const learned = game.run.learned.includes(k.id);
          const available = game.run.available.includes(k.id);
          const tier = knowhowTier(game, k.id);
          const blocker = jobBlocker(game, { kind: "study", knowhowId: k.id });
          return (
            <li key={k.id} className={learned ? "learned" : available ? "ready" : "locked"}>
              <div>
                <strong>{k.name}</strong> <span className="chip">{TIER_TEXT[tier]}</span>
                <p className="blurb">{k.blurb}</p>
                {!learned && !available && <p className="why">{k.hint}</p>}
              </div>
              {learned ? (
                <span className="chip win">Known</span>
              ) : available ? (
                <div className="row-action">
                  <button className="btn small primary" disabled={!!blocker} onClick={() => dispatch({ type: "enqueue", spec: { kind: "study", knowhowId: k.id } })}>
                    Study · {duration(studyMs(game, k.id))}
                  </button>
                  {blocker && <span className="why">{blocker}</span>}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Habits({ game }: { game: GameState }) {
  const templates = [...new Set([...Object.keys(game.run.reps), ...game.run.habitsKnown])];
  if (templates.length === 0) return <p className="empty">Do anything enough times and it becomes a Habit.</p>;
  return (
    <ul className="plain">
      {templates.map((t) => {
        const need = habitThreshold(game, t);
        const n = game.run.reps[t] ?? 0;
        const known = game.run.habitsKnown.includes(t);
        return (
          <li key={t} className="mini-progress">
            <span>{habitLabel(game, t)}</span>
            <span className="num muted">{known ? "Habit" : `${Math.min(n, need)}/${need}`}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Codex({ game }: { game: GameState }) {
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const seen = PARTS.filter((part) => (game.meta.codex.parts[part.id] ?? 0) > 0);
  const matches = seen.filter((part) => (part.name + " " + part.category).toLowerCase().includes(filter.trim().toLowerCase()));
  const selected = matches.find((part) => part.id === selectedId) ?? matches[0];
  const sources = selected ? PLACES.filter((place) => game.meta.codex.places[place.id] && place.finds.some((find) => find.partId === selected.id)) : [];
  return (
    <div className="codex">
      <h3 className="label">Places</h3>
      <ul className="plain">
        {PLACES.filter((p) => (game.meta.codex.places[p.id] ?? 0) > 0).map((p) => {
          const n = game.meta.codex.places[p.id] ?? 0;
          const level = codexLevel(n);
          const next = CODEX_LEVELS[level + 1];
          return (
            <li key={p.id} className="mini-progress">
              <span>
                {p.name} · Lv {level}
              </span>
              <span className="num muted">{next ? `${n}/${next} trips` : `${n} trips`}</span>
            </li>
          );
        })}
      </ul>
      <p className="hint">Each Codex level makes trips there 5% faster and finds a little less rusty.</p>
      <h3 className="label">Parts seen</h3>
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

function HallOfFame({ game }: { game: GameState }) {
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(12);
  if (!game.meta.hallOfFame.length) return <p className="empty">Vehicles appear here after retirement or at the end of a Season.</p>;
  const query = filter.trim().toLowerCase();
  const entries = [...game.meta.hallOfFame].reverse().filter((entry) =>
    `${entry.name} ${getVehicle(entry.vehicleId).name} Season ${entry.season}`.toLowerCase().includes(query)
  );
  return <>
    <HeritageDesk game={game} />
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

const SECTIONS = ["Journal", "Know-how", "Habits", "Codex", "Rivals", "Hall of Fame", "Seasons", "Timecards"] as const;

export function NotebookPanel() {
  const game = useGame((s) => s.game);
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("Journal");
  if (!game) return null;
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = sections[(sections.indexOf(tab) + step + sections.length) % sections.length];
    setTab(next);
    document.getElementById(`nb-tab-${next}`)?.focus();
  };
  const sections = SECTIONS.filter((name) => name !== "Timecards" || game.era?.discipline === "rally" || !!game.meta.rallyCards?.length);
  return (
    <section className="section" aria-labelledby="notebook-h">
      <h2 id="notebook-h">Notebook</h2>
      <Tips ids={["codex", "knowhow"]} />
      <div className="subtabs" role="tablist" aria-label="Notebook sections" onKeyDown={onTabKey}>
        {sections.map((s) => (
          <button key={s} role="tab" id={`nb-tab-${s}`} aria-controls="nb-panel" aria-selected={tab === s} tabIndex={tab === s ? 0 : -1} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>
            {s}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="nb-panel" aria-labelledby={`nb-tab-${tab}`}>
      {tab === "Journal" && <Journal game={game} />}
      {tab === "Know-how" && <KnowhowList game={game} />}
      {tab === "Habits" && <Habits game={game} />}
      {tab === "Codex" && <Codex game={game} />}
      {tab === "Rivals" && <Rivals game={game} />}
      {tab === "Hall of Fame" && <HallOfFame game={game} />}
      {tab === "Seasons" && <SeasonLog log={game.meta.seasonLog ?? []} />}
      {tab === "Timecards" && <RallyCards cards={game.meta.rallyCards ?? []} />}
      </div>
    </section>
  );
}
