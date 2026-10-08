"use client";

import { useState } from "react";
import { RIVALS } from "@/core/content/events";
import { KNOWHOW } from "@/core/content/knowhow";
import { PARTS } from "@/core/content/parts";
import { PLACES, codexLevel, CODEX_LEVELS } from "@/core/content/places";
import { getVehicle } from "@/core/content/vehicles";
import { habitThreshold } from "@/core/habits";
import { jobBlocker } from "@/core/jobs";
import { knowhowTier, studyMs } from "@/core/knowhowEngine";
import type { GameState } from "@/core/types";
import { conditionName, duration, num, seasonClock } from "../format";
import { habitLabel } from "../labels";
import { useGame } from "../store";
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
                <button className="btn small primary" disabled={!!blocker} onClick={() => dispatch({ type: "enqueue", spec: { kind: "study", knowhowId: k.id } })}>
                  Study · {duration(studyMs(game, k.id))}
                </button>
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
      <ul className="chips">
        {PARTS.filter((p) => (game.meta.codex.parts[p.id] ?? 0) > 0).map((p) => (
          <li key={p.id} className="chip">
            {p.name} <span className="num muted">{num(game.meta.codex.parts[p.id] ?? 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Rivals({ game }: { game: GameState }) {
  return (
    <ul className="plain">
      {RIVALS.map((r) => {
        const rec = game.meta.rivals[r.id];
        return (
          <li key={r.id}>
            <strong>{r.name}</strong> <span className="muted">{r.line}</span>
            <div className="num">{rec ? `${rec.wins} beaten · ${rec.losses} lost` : "Not met yet"}</div>
          </li>
        );
      })}
    </ul>
  );
}

function HallOfFame({ game }: { game: GameState }) {
  const entries = [...game.meta.hallOfFame].reverse().slice(0, 30);
  if (entries.length === 0) return <p className="empty">Every vehicle you finish ends up here when a Season ends.</p>;
  return (
    <ul className="plain hof">
      {entries.map((e, i) => (
        <li key={i}>
          <strong>{e.name}</strong> <span className="muted">Season {e.season} · {getVehicle(e.vehicleId).name}</span>
          <div className="num">
            {e.history.wins} wins from {e.history.races} races{e.history.dnfs ? ` · ${e.history.dnfs} DNF` : ""}
          </div>
          <div className="muted small">{e.parts.map((p) => `${p.slot}: ${conditionName(p.condition)}, from ${p.origin}`).join(" · ")}</div>
        </li>
      ))}
    </ul>
  );
}

const SECTIONS = ["Journal", "Know-how", "Habits", "Codex", "Rivals", "Hall of Fame"] as const;

export function NotebookPanel() {
  const game = useGame((s) => s.game);
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("Journal");
  if (!game) return null;
  return (
    <section className="section" aria-labelledby="notebook-h">
      <h2 id="notebook-h">Notebook</h2>
      <Tips ids={["codex", "knowhow"]} />
      <div className="subtabs" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s} role="tab" id={`nb-tab-${s}`} aria-controls="nb-panel" aria-selected={tab === s} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>
            {s}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="nb-panel" aria-labelledby={`nb-tab-${tab}`}>
      {tab === "Journal" && (
        <ol className="journal">
          {[...game.meta.journal].reverse().map((j) => (
            <li key={j.id}>
              <span className="when muted">
                Season {j.season} · {seasonClock(j.seasonMs)}
              </span>
              <p>{j.text}</p>
            </li>
          ))}
        </ol>
      )}
      {tab === "Know-how" && <KnowhowList game={game} />}
      {tab === "Habits" && <Habits game={game} />}
      {tab === "Codex" && <Codex game={game} />}
      {tab === "Rivals" && <Rivals game={game} />}
      {tab === "Hall of Fame" && <HallOfFame game={game} />}
      </div>
    </section>
  );
}
