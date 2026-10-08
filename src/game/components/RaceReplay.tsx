"use client";

import { useEffect, useRef, useState } from "react";
import { DISCIPLINES, RIVAL_BY_ID, getVenue, venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import type { GameState, RaceResult } from "@/core/types";
import { conditionName, num, ordinal } from "../format";
import { useGame } from "../store";
import { RaceScreen, type RaceShown } from "./race/RaceScreen";

/** A replay plays the whole race in this long, however long the real one was. */
const REPLAY_MS = 14_000;

function shownFrom(game: GameState, race: RaceResult): RaceShown {
  const discipline = game.era?.discipline ?? "dirt";
  const vehicle = game.run.vehicles.find((v) => v.uid === race.vehicleUid);
  const durationMs = race.durationMs ?? getVenue(race.venueId).events[race.event].durationMs * DISCIPLINES[discipline].durationMult;
  return {
    venueId: race.venueId,
    venueLabel: venueName(race.venueId, discipline),
    event: race.event,
    vehicleId: vehicle?.vehicleId ?? "push_mower",
    fieldSize: race.fieldSize,
    beats: race.beats,
    laps: race.laps,
    durationMs: Math.max(durationMs, race.beats[race.beats.length - 1]?.at ?? 0),
    strip: discipline === "drag",
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plays one race; remounted per race via `key`, so progress starts fresh. */
function Replay({ race, game, onClose, onFix }: { race: RaceResult; game: GameState; onClose: () => void; onFix: () => void }) {
  const [t, setT] = useState(() => (prefersReducedMotion() ? 1 : 0));

  useEffect(() => {
    if (t >= 1) return;
    const start = performance.now() - t * REPLAY_MS;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / REPLAY_MS);
      setT(p);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // Only start once per mount; skipping sets t to 1 directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = shownFrom(game, race);
  const finished = t >= 1;
  const vehicle = game.run.vehicles.find((v) => v.uid === race.vehicleUid);
  const weakPart = race.weakestSlot ? vehicle?.parts[race.weakestSlot] : undefined;
  const rival = race.rival ? RIVAL_BY_ID[race.rival.id] : null;

  return (
    <>
      <h2 id="replay-h" className="sr-only">
        Replay: {shown.venueLabel} {race.event}
      </h2>
      <RaceScreen race={shown} ms={t * shown.durationMs} lines={finished ? 0 : 3} />
      {finished ? (
        <div className="debrief">
          <p className="big">{race.dnf ? "DNF" : `${ordinal(race.position)} of ${race.fieldSize}`}</p>
          <p>
            +{num(race.prize)} Scrap Bucks · +{race.rep} Rep
            {rival && ` · ${rival.name}: ${race.rival?.beaten ? "beaten" : "ahead of you"}`}
          </p>
          {!race.dnf && race.position > 1 && <p className="muted">You were {Math.abs(race.margin * 100).toFixed(1)}% off the car ahead.</p>}
          {race.wear.length > 0 && <p>Wear: {race.wear.map((w) => `${w.slot} ${conditionName(w.from)} → ${conditionName(w.to)}`).join(", ")}</p>}
          {weakPart && (
            <p className="tip">
              Weakest link: the {race.weakestSlot}, a {conditionName(weakPart.condition)} {getPart(weakPart.partId).name}.{" "}
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
        <button className="btn" onClick={() => setT(1)}>
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
