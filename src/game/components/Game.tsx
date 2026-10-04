"use client";

import { useEffect, useRef, useState } from "react";
import { getKnowhow } from "@/core/content/knowhow";
import { duration, num, seasonClock } from "../format";
import { useGame } from "../store";
import { BuildPanel } from "./BuildPanel";
import { JobsBoard } from "./JobsBoard";
import { LegacyPanel } from "./LegacyPanel";
import { NotebookPanel } from "./NotebookPanel";
import { PartsPanel } from "./PartsPanel";
import { RacePanel } from "./RacePanel";
import { RaceReplay } from "./RaceReplay";
import { SettingsPanel } from "./SettingsPanel";
import { TeamPanel } from "./TeamPanel";
import { TripsPanel } from "./TripsPanel";

type TabId = "trips" | "garage" | "race" | "notebook" | "legacy" | "team" | "settings";

const TABS: { id: TabId; label: string; reveal: string | null }[] = [
  { id: "trips", label: "Trips", reveal: null },
  { id: "garage", label: "Garage", reveal: "garage" },
  { id: "race", label: "Race", reveal: "race" },
  { id: "notebook", label: "Notebook", reveal: "codex" },
  { id: "legacy", label: "Legacy", reveal: "legacy" },
  { id: "team", label: "Team", reveal: "team" },
  { id: "settings", label: "Settings", reveal: null },
];

const TICK_MS = 500;
const SAVE_MS = 5000;

function Header() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const r = game.run;
  const showMaterials = r.revealed.includes("materials");
  return (
    <header className="topbar">
      <div className="brand">
        <h1>Rags to Races</h1>
        <span className="season">
          {game.era ? `${game.era.teamName} · ` : ""}Season {game.meta.seasonsPlayed + 1} · {seasonClock(r.seasonMs)}
        </span>
      </div>
      <dl className="resources">
        <div>
          <dt>Scrap Bucks</dt>
          <dd className="num">{num(r.cash)}</dd>
        </div>
        <div>
          <dt>Rep</dt>
          <dd className="num">{num(r.rep)}</dd>
        </div>
        {showMaterials && (
          <div>
            <dt>Metal · Rubber · Wiring</dt>
            <dd className="num">
              {r.materials.metal} · {r.materials.rubber} · {r.materials.wiring}
            </dd>
          </div>
        )}
        {(game.scrap.lp > 0 || game.scrap.resets > 0) && (
          <div>
            <dt>Legacy</dt>
            <dd className="num">{num(game.scrap.lp)} LP</dd>
          </div>
        )}
        {game.era && (
          <div>
            <dt>Team</dt>
            <dd className="num">{num(game.team.tp)} TP</dd>
          </div>
        )}
      </dl>
    </header>
  );
}

function AwayDialog() {
  const away = useGame((s) => s.away);
  const close = useGame((s) => s.closeAway);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (away && ref.current && !ref.current.open) ref.current.showModal();
  }, [away]);
  if (!away) return null;
  const onClose = () => {
    ref.current?.close();
    close();
  };
  return (
    <dialog ref={ref} className="away" onClose={onClose} aria-labelledby="away-h">
      <h2 id="away-h">While you were away</h2>
      <p className="muted">
        {duration(away.ms)}
        {away.capped ? " (progress stops counting after 48 hours)" : ""}
      </p>
      <ul>
        {away.trips > 0 && <li>{away.trips} trips, {away.partsFound} parts found</li>}
        {away.races > 0 && <li>{away.races} races, {away.wins} won</li>}
        {away.cash !== 0 && <li>{away.cash > 0 ? "+" : ""}{num(away.cash)} Scrap Bucks</li>}
        {away.rep > 0 && <li>+{away.rep} Rep</li>}
        {away.learned.map((id) => (
          <li key={id}>Learned {getKnowhow(id).name}</li>
        ))}
        {away.trips === 0 && away.races === 0 && away.learned.length === 0 && <li>Nothing much. Queue long jobs before you leave.</li>}
      </ul>
      <button className="btn primary" onClick={onClose} autoFocus>
        Back to the garage
      </button>
    </dialog>
  );
}

function Toast() {
  const error = useGame((s) => s.error);
  const clear = useGame((s) => s.clearError);
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(clear, 4000);
    return () => window.clearTimeout(t);
  }, [error, clear]);
  if (!error) return null;
  return (
    <div className="toast" role="status">
      {error}
      <button className="link-btn" onClick={clear} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function Game() {
  const game = useGame((s) => s.game);
  const load = useGame((s) => s.load);
  const tick = useGame((s) => s.tick);
  const save = useGame((s) => s.save);
  const [tab, setTab] = useState<TabId>("trips");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __rtr: typeof useGame }).__rtr = useGame;
    load();
    const t = window.setInterval(tick, TICK_MS);
    const s = window.setInterval(save, SAVE_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", save);
    return () => {
      window.clearInterval(t);
      window.clearInterval(s);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", save);
    };
  }, [load, tick, save]);

  if (!game) return <div className="loading">Opening the garage…</div>;

  const era = game.era ? "shop" : "curb";
  const teamStyle = game.era ? ({ "--team-a": game.era.colors[0], "--team-b": game.era.colors[1] } as React.CSSProperties) : undefined;
  const tabs = TABS.filter((t) => !t.reveal || game.run.revealed.includes(t.reveal) || (t.id === "notebook" && game.meta.journal.length > 0));
  const active = tabs.some((t) => t.id === tab) ? tab : "trips";

  return (
    <div className="game" data-era={era} style={teamStyle}>
      <Header />
      <nav className="tabs" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.id} className={active === t.id ? "on" : ""} aria-current={active === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="layout">
        <main className="main">
          {active === "trips" && <TripsPanel />}
          {active === "garage" && (
            <div className="panel">
              <PartsPanel />
              <BuildPanel />
            </div>
          )}
          {active === "race" && <RacePanel />}
          {active === "notebook" && <NotebookPanel />}
          {active === "legacy" && <LegacyPanel />}
          {active === "team" && <TeamPanel />}
          {active === "settings" && <SettingsPanel />}
        </main>
        <JobsBoard />
      </div>
      <RaceReplay onFix={() => setTab("garage")} />
      <AwayDialog />
      <Toast />
    </div>
  );
}
