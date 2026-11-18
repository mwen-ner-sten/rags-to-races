"use client";

import { useEffect, useRef, useState } from "react";
import { DISCIPLINES, RIVAL_BY_ID, getVenue, venueName } from "@/core/content/events";
import { CLUB_COURSES } from "@/core/clubTrack";
import { getPart } from "@/core/content/parts";
import { totalTime } from "@/core/timecards";
import type { GameState, RaceResult } from "@/core/types";
import { retiredVehicle } from "@/core/vehicleArchive";
import { conditionName, num } from "../format";
import { useGame } from "../store";
import { finishText } from "./race/resultText";
import { RaceScreen, type RaceShown } from "./race/RaceScreen";

/** A replay plays the whole race in this long, however long the real one was. */
const REPLAY_MS = 14_000;

function shownFrom(game: GameState, race: RaceResult): RaceShown {
  const discipline = game.era?.discipline ?? "dirt";
  const vehicle = game.run.vehicles.find((v) => v.uid === race.vehicleUid);
  const durationMs = race.durationMs ?? getVenue(race.venueId).events[race.event].durationMs * DISCIPLINES[discipline].durationMult;
  return {
    venueId: race.venueId,
    venueLabel: `${venueName(race.venueId, discipline)}${race.course ? ` · ${CLUB_COURSES[race.course].name}` : ""}`,
    event: race.event,
    vehicleId: vehicle?.vehicleId ?? retiredVehicle(game, race.vehicleUid)?.vehicleId ?? "push_mower",
    fieldSize: race.fieldSize,
    beats: race.beats,
    laps: race.laps,
    durationMs: Math.max(durationMs, race.beats[race.beats.length - 1]?.at ?? 0),
    strip: discipline === "drag",
    rally: discipline === "rally",
    course: race.course,
    rounds: race.rounds,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays one race; remounted per race via `key`, so progress starts fresh. */
function Replay({ race, game, onClose, onFix }: { race: RaceResult; game: GameState; onClose: () => void; onFix: () => void }) {
  const [t, setT] = useState(() => (prefersReducedMotion() ? 1 : 0));

  const progress = useRef(t);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState(1);

  function seek(value: number) {
    progress.current = value;
    setT(value);
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = 0;
    const step = (now: number) => {
      progress.current = Math.min(1, progress.current + (now - last) * speed / REPLAY_MS);
      last = now;
      setT(progress.current);
      if (progress.current < 1) frame = requestAnimationFrame(step);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  const shown = shownFrom(game, race);
  const finished = t >= 1;
  const weakPart = race.weakestPart;
  const rival = race.rival ? RIVAL_BY_ID[race.rival.id] : null;

  return (
    <>
      <h2 id="replay-h" className="sr-only">
        Replay: {shown.venueLabel} {race.event}
      </h2>
      <RaceScreen race={shown} ms={t * shown.durationMs} lines={finished ? 0 : 3} />
      <div className="actions replay-transport">
        <button className="btn" onClick={() => {
          if (finished) { progress.current = 0; setT(0); }
          setPlaying(!playing);
        }}>{playing ? "Pause replay" : finished ? "Replay again" : "Resume replay"}</button>
        <label>Replay speed{" "}
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {[0.5, 1, 2].map((value) => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
        <label>Race progress{" "}
          <input type="range" min="0" max="1000" value={Math.round(t * 1000)} onChange={(event) => seek(Number(event.target.value) / 1000)} />
        </label>
      </div>
      {finished ? (
        <div className="debrief">
          <p className="big">{finishText(race)}</p>
          {race.rallyClock && !race.dnf && <p>Stage time · {(totalTime(race.rallyClock.splitsMs) / 1000).toFixed(1)}s
            {race.rallyClock.previousMs && <> · {race.rallyClock.previousCar}’s previous class best was {(race.rallyClock.previousMs / 1000).toFixed(1)}s</>}
          </p>}
          <p>
            +{num(race.prize)} Scrap Bucks · +{race.rep} Rep
            {rival && ` · ${rival.name}: ${race.rival?.beaten ? "beaten" : "ahead of you"}`}
          </p>
          {race.caution && <p>The yellow flag came out.</p>}
          {race.rallyClock?.regularity && <p>{race.rallyClock.regularity.passed ? "Regularity certificate earned" : "Outside regularity tolerance"} · {race.rallyClock.regularity.matched}/{race.rallyClock.regularity.required} stages within 8%.</p>}
          {race.course && <p>{CLUB_COURSES[race.course].brief}</p>}
          {race.rivalOut && rival && <p>{rival.name}’s car quit before the flag.</p>}
          {!race.dnf && race.position > 1 && <p className="muted">You were {Math.abs(race.margin * 100).toFixed(1)}% off the car ahead.</p>}
          {race.wear.length > 0 && <p>Wear: {race.wear.map((w) => `${w.slot} ${conditionName(w.from)} → ${conditionName(w.to)}`).join(", ")}</p>}
          {race.weakestSlot && (
            <p className="tip">
              Weakest link at race entry: the {race.weakestSlot}{weakPart ? `, a ${conditionName(weakPart.condition)} ${getPart(weakPart.partId).name}` : ""}.{" "}
              <button
                className="link-btn"
                onClick={() => {
                  onClose();
                  onFix();
                }}
              >
                Fix it in the garage
              </button>
            </p>
          )}
          <button className="btn primary" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => seek(1)}>
          Skip to the flag
        </button>
      )}
    </>
  );
}

export function RaceReplay({ onFix }: { onFix: () => void }) {
  const race = useGame((s) => s.replay);
  const game = useGame((s) => s.game);
  const close = useGame((s) => s.closeReplay);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (race && d && !d.open) d.showModal();
  }, [race]);

  const onClose = () => {
    dialog.current?.close();
    close();
  };

  return (
    <dialog ref={dialog} className="replay" onClose={onClose} aria-labelledby="replay-h">
      {race && game && <Replay key={race.id} race={race} game={game} onClose={onClose} onFix={onFix} />}
    </dialog>
  );
}
