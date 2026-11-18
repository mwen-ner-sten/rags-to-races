"use client";

import { useEffect, useRef, useState } from "react";
import type { CareerDestination } from "@/core/careerAdvice";
import { LAYERS } from "@/core/layers";
import { venueName } from "@/core/content/events";
import { getKnowhow } from "@/core/content/knowhow";
import { capitalize, duration, num, ordinal, seasonClock } from "../format";
import { useGame } from "../store";
import { BuildPanel } from "./BuildPanel";
import { CareerDesk, CareerFocus, type CareerJump } from "./CareerDesk";
import { feedAge } from "./Feed";
import { FeedToasts } from "./FeedToasts";
import { Guide } from "./Guide";
import { JobsBoard } from "./JobsBoard";
import { LegacyPanel } from "./LegacyPanel";
import { NotebookPanel } from "./NotebookPanel";
import { PartsPanel } from "./PartsPanel";
import { RacePanel } from "./RacePanel";
import { RaceReplay } from "./RaceReplay";
import { SettingsPanel } from "./SettingsPanel";
import { ownerGate } from "@/core/ownership";
import { promoterGate } from "@/core/promoter";
import { OwnerPanel } from "./OwnerPanel";
import { PromoterPanel } from "./PromoterPanel";
import { clubGate } from "@/core/club";
import { ServiceCounter } from "./ServiceCounter";
import { ClubPanel } from "./ClubPanel";
import { CountyMatchPanel } from "./CountyMatchPanel";
import { ManufacturerPanel, WorksDrawingWorkshop } from "./ManufacturerPanel";
import { MotorPoolPanel } from "./MotorPoolPanel";
import { TeamPanel } from "./TeamPanel";
import { hasUnreadTip } from "./Tips";
import { TripsPanel } from "./TripsPanel";

type TabId = "trips" | "garage" | "race" | "notebook" | "legacy" | "team" | "owner" | "promoter" | "club" | "manufacturer" | "settings";

/** Tips that live on each tab; an unread one puts a dot on the tab. */
const TAB_TIPS: Partial<Record<TabId, readonly string[]>> = {
  trips: ["places", "tools"],
  garage: ["garage", "materials", "driveway", "build", "venues", "street_stock"],
  race: ["race"],
  notebook: ["codex", "knowhow"],
  team: ["crew"],
};

const TABS: { id: TabId; label: string; reveal: string | null }[] = [
  { id: "trips", label: "Trips", reveal: null },
  { id: "garage", label: "Garage", reveal: "garage" },
  { id: "race", label: "Race", reveal: "race" },
  { id: "notebook", label: "Notebook", reveal: "codex" },
  { id: "legacy", label: "Legacy", reveal: "legacy" },
  { id: "team", label: "Team", reveal: "team" },
  { id: "owner", label: "Owner", reveal: "owner" },
  { id: "promoter", label: "Circuit", reveal: "promoter" },
  { id: "club", label: "Club", reveal: "club" },
  { id: "manufacturer", label: "Manufacturer", reveal: "manufacturer" },
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

function AwayDialog({ onShow }: { onShow: (tab: TabId) => void }) {
  const away = useGame((s) => s.away);
  const close = useGame((s) => s.closeAway);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (away && ref.current && !ref.current.open) ref.current.showModal();
  }, [away]);
  if (!away) return null;
  const dismiss = (destination?: TabId) => {
    ref.current?.close();
    close();
    if (destination) onShow(destination);
  };
  return (
    <dialog ref={ref} className="away" onClose={close} aria-labelledby="away-h">
      <h2 id="away-h">While you were away</h2>
      <p className="muted">
        {duration(away.ms)}
        {away.capped ? " (progress stops counting after 48 hours)" : ""}
      </p>
      {away.careerReports.map((report) => (
        <section key={report.tab} className="section" aria-labelledby={`away-${report.tab}-h`}>
          <h3 id={`away-${report.tab}-h`}>{report.title}</h3>
          <p>{report.detail}</p>
          <p>{report.next}</p>
          <div className="actions">
            <button className="btn" type="button" onClick={() => dismiss(report.tab)}>{report.tab === "owner" ? "Open championship report" : "Open circuit report"}</button>
            {report.circuitOpened && <button className="btn" type="button" onClick={() => dismiss("promoter")}>Open Circuit Office</button>}
          </div>
        </section>
      ))}
      <ul>
        {away.trips > 0 && <li>{away.trips} trips, {away.partsFound} parts found</li>}
        {away.races > 0 && <li>{away.races} races, {away.wins} won</li>}
        {away.cash !== 0 && <li>{away.cash > 0 ? "+" : ""}{num(away.cash)} Scrap Bucks</li>}
        {away.rep > 0 && <li>+{away.rep} Rep</li>}
        {away.driveway > 0 && (
          <li>
            {away.driveway} part{away.driveway > 1 ? "s" : ""} waiting on the driveway
          </li>
        )}
        {away.learned.map((id) => (
          <li key={id}>Learned {getKnowhow(id).name}</li>
        ))}
        {away.trips === 0 && away.races === 0 && away.careerReports.length === 0 && away.learned.length === 0 && <li>Nothing much. Queue long jobs before you leave.</li>}
      </ul>
      {away.items.length > 0 && (
        <>
          <h3 className="label">What happened</h3>
          <ul className="away-items">
            {away.items.map((item) => (
              <li key={item.id}>
                {item.text} <span className="muted num">{feedAge(Math.max(0, away.seasonMs - item.at))}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button className="btn primary" onClick={() => dismiss()} autoFocus>
        Back to the garage
      </button>
    </dialog>
  );
}

/** What the game did on its own (like clearing an overflowing driveway), until the player dismisses it. */
function Notices() {
  const notices = useGame((s) => s.game?.run.notices ?? []);
  const dispatch = useGame((s) => s.dispatch);
  if (notices.length === 0) return null;
  return (
    <div className="notice notices" role="status">
      <ul>
        {notices.slice(-5).map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
      {notices.length > 5 && <p className="muted">…and {notices.length - 5} earlier.</p>}
      <button className="link-btn" onClick={() => dispatch({ type: "dismissNotices" })}>
        Got it
      </button>
    </div>
  );
}

/** A race you entered finished while you were on another tab: say how it went, and offer the replay. */
function RaceFinished({ onRaceTab }: { onRaceTab: boolean }) {
  const race = useGame((s) => s.finished);
  const discipline = useGame((s) => s.game?.era?.discipline ?? "dirt");
  const clear = useGame((s) => s.clearFinished);
  const showReplay = useGame((s) => s.showReplay);
  useEffect(() => {
    if (race && onRaceTab) clear();
  }, [race, onRaceTab, clear]);
  if (!race || onRaceTab) return null;
  return (
    <div className="toast race-toast" role="status">
      <span>
        <strong>{race.dnf ? "DNF" : race.position === 1 ? "You won" : `${ordinal(race.position)} place`}</strong>
        {race.position === 1 && !race.dnf ? " the " : " at the "}
        {venueName(race.venueId, discipline)} {capitalize(race.event)}
        {race.prize > 0 && ` · +${num(race.prize)} Scrap Bucks`}
        {race.rep > 0 && ` · +${race.rep} Rep`}
      </span>
      <button
        className="btn small primary"
        onClick={() => {
          showReplay(race);
          clear();
        }}
      >
        Watch
      </button>
      <button className="link-btn" onClick={clear} aria-label="Dismiss">
        ×
      </button>
    </div>
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
    <div className="toast" role="alert">
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
  const [careerJump, setCareerJump] = useState<CareerJump | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __rtr: typeof useGame }).__rtr = useGame;
    // Re-running effects in development must not consume and dismiss the away report.
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      load();
    }
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
  const tabs = TABS.filter((t) => {
    if (t.id === "owner") return !!game.owner || ownerGate(game).ok;
    if (t.id === "promoter") return !!game.promoter || promoterGate(game);
    if (t.id === "club") return !clubGate(game);
    if (t.id === "manufacturer") return !!game.manufacturer?.invites.length;
    if (t.id === "garage" && game.motorPool?.custody) return true;
    if (t.id === "team" && (game.era || LAYERS.team.gate(game).ok)) return true;
    if (t.id === "legacy" && LAYERS.scrap.gate(game).ok) return true;
    if (t.id === "race" && game.run.vehicles.length > 0) return true;
    return !t.reveal || game.run.revealed.includes(t.reveal) || (t.id === "notebook" && game.meta.journal.length > 0);
  });
  const active = tabs.some((t) => t.id === tab) ? tab : "trips";
  const jump = careerJump?.target.tab === active ? careerJump : null;
  const showTab = (next: TabId) => {
    setCareerJump(null);
    setTab(next);
  };
  const showCareerTarget = (target: CareerDestination) => {
    setCareerJump((previous) => ({ target, request: (previous?.request ?? 0) + 1 }));
    setTab(target.tab);
  };

  return (
    <div className="game" data-era={era} style={teamStyle}>
      <Header />
      <nav className="tabs" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.id} className={active === t.id ? "on" : ""} aria-current={active === t.id ? "page" : undefined} onClick={() => showTab(t.id)}>
            {t.label}
            {active !== t.id && hasUnreadTip(game, TAB_TIPS[t.id] ?? []) && <span className="tab-dot" aria-label="New tip" />}
            {t.id === "garage" && game.run.driveway.length > 0 && (
              <span className="tab-badge num" aria-label={`${game.run.driveway.length} on the driveway`}>
                {game.run.driveway.length}
              </span>
            )}
          </button>
        ))}
      </nav>
      {!game.meta.careerPin && <Guide tab={active} onShow={showTab} />}
      <div className="layout">
        <main className="main">
          <Notices />
          <CareerDesk key={active} game={game} active={active} onOpen={showCareerTarget} />
          <CareerFocus jump={jump} />
          {active === "trips" && <TripsPanel />}
          {active === "garage" && (
            <div className="panel">
              <PartsPanel />
              <ServiceCounter game={game} />
              <WorksDrawingWorkshop game={game} />
              <MotorPoolPanel game={game} />
              <BuildPanel />
            </div>
          )}
          {active === "race" && <>
            <CountyMatchPanel game={game} />
            <RacePanel key={jump?.request} initialVenue={jump?.target.tab === "race" ? jump.target.venueId : undefined} />
          </>}
          {active === "notebook" && <NotebookPanel key={jump?.request} section={jump?.target.tab === "notebook" ? jump.target.section : undefined} />}
          {active === "legacy" && <LegacyPanel key={jump?.request} initialObjective={jump?.target.tab === "legacy" ? jump.target.objective : undefined} />}
          {active === "team" && <TeamPanel key={jump?.request} plannedDiscipline={jump?.target.tab === "team" && "discipline" in jump.target ? jump.target.discipline : undefined} />}
          {active === "owner" && <OwnerPanel />}
          {active === "promoter" && <PromoterPanel />}
          {active === "club" && <ClubPanel />}
          {active === "manufacturer" && <ManufacturerPanel />}
          {active === "settings" && <SettingsPanel />}
        </main>
        <JobsBoard />
      </div>
      <RaceReplay onFix={() => showTab("garage")} />
      <AwayDialog onShow={showTab} />
      <RaceFinished onRaceTab={active === "race"} />
      <Toast />
      <FeedToasts />
    </div>
  );
}
