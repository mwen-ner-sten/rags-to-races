"use client";

import { useId, useState } from "react";
import { vehicleSprite } from "@/game/sprites";
import { OpponentCar, PlayerCar } from "./TrackCars";
import { CheckerPattern, FinishFlag, StartLights } from "./TrackOverlays";
import { Decor, Surface, normalizeVenue } from "./TrackScenery";
import {
  OVAL,
  STRIP,
  carDistance,
  carPose,
  clamp,
  clampField,
  lanePlan,
  opponentRank,
  stripLaneHeight,
  viewBoxFor,
  type Pose,
  type TrackShape,
} from "./trackGeometry";

export interface TrackProps {
  /** "backyard" | "dirt" | "county_fair" | "regional" | "state" (theme key) */
  venueId: string;
  /** "strip" is a straight drag strip. Default "oval". */
  shape?: "oval" | "strip";
  vehicleId: string;
  /** Total cars including the player (2-10). */
  fieldSize: number;
  laps: number;
  /** 0..1 overall race progress. */
  progress: number;
  /** Player's running position, 1 = leading. May be fractional during an overtake. */
  playerRank: number;
  /** Progress at which the player stopped; they pull off and stay put while the others carry on. */
  dnfAt?: number;
  finished?: boolean;
  compact?: boolean;
  /** CSS transition on car transforms: ~500 for the live view, 0 when driven every frame. */
  transitionMs?: number;
  label?: string;
}

const PULL_OFF_SPAN = 0.04; // progress it takes a stopped car to roll to the side
const COAST = 10;
const TILT = 25;

interface Placement {
  player: Pose;
  opponents: Pose[];
  scale: number;
  pull: number;
}

interface PlacementInput {
  shape: TrackShape;
  field: number;
  laps: number;
  progress: number;
  rank: number;
  frozen: number | null;
  dnfAt: number | undefined;
}

function place(input: PlacementInput): Placement {
  const { shape, field, laps, progress, rank, frozen, dnfAt } = input;
  const plan = lanePlan(shape, field);
  const pull =
    dnfAt === undefined ? 0 : clamp((progress - dnfAt) / PULL_OFF_SPAN, 0, 1);
  const stopped = dnfAt !== undefined && progress >= dnfAt;
  const base = stopped && frozen !== null ? frozen : carDistance(shape, rank, progress, laps);
  const lateral = plan.player + (plan.pulloff - plan.player) * pull;
  const pose = carPose(shape, base + COAST * pull, lateral);
  const opponents = plan.opponents.map((lane, j) =>
    carPose(shape, carDistance(shape, opponentRank(j, rank), progress, laps), lane),
  );
  return {
    player: { ...pose, heading: pose.heading + TILT * pull },
    opponents,
    scale: plan.carScale,
    pull,
  };
}

function overlayAnchors(shape: TrackShape, field: number) {
  if (shape === "strip") {
    const top = STRIP.cy - (field * stripLaneHeight(field)) / 2;
    return { lights: { x: STRIP.x0, y: top - 16 }, flag: { x: STRIP.x1, y: top - 6 } };
  }
  return { lights: { x: OVAL.cx, y: OVAL.cy }, flag: { x: OVAL.cx - 15, y: OVAL.cy + 4 } };
}

export function Track(props: TrackProps) {
  const {
    venueId,
    shape = "oval",
    vehicleId,
    fieldSize,
    laps,
    progress,
    playerRank,
    dnfAt,
    finished = false,
    compact = false,
    transitionMs = 0,
    label = "Race track",
  } = props;
  const rawId = useId();
  const patternId = `tk-chk-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const field = clampField(fieldSize);
  const lapCount = shape === "strip" ? 1 : Math.max(1, Math.round(laps) || 1);
  const p = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const rank = clamp(Number.isFinite(playerRank) ? playerRank : field, 1, field);
  const stopped = dnfAt !== undefined && p >= dnfAt;

  // Remember where the player stopped so later rank changes in the field can't drag the dead car along.
  const [frozen, setFrozen] = useState<number | null>(null);
  if (stopped && frozen === null && dnfAt !== undefined) {
    setFrozen(carDistance(shape, rank, dnfAt, lapCount));
  } else if (!stopped && frozen !== null) {
    setFrozen(null);
  }

  const placed = place({ shape, field, laps: lapCount, progress: p, rank, frozen, dnfAt });
  const anchors = overlayAnchors(shape, field);
  const showOverlays = !compact;
  const running = p > 0 && p < 1 && !finished && placed.pull === 0;

  return (
    <svg
      className={compact ? "tk tk-compact" : "tk"}
      data-venue={normalizeVenue(venueId)}
      data-shape={shape}
      viewBox={viewBoxFor(shape, field, compact)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <defs>
        <CheckerPattern id={patternId} />
      </defs>
      <rect x={0} y={-20} width={400} height={240} className="tk-ground" />
      <Surface shape={shape} field={field} patternId={patternId} />
      {showOverlays && <Decor venue={normalizeVenue(venueId)} shape={shape} field={field} />}
      {placed.opponents
        .map((pose, j) => ({ pose, j, rank: opponentRank(j, rank) }))
        .sort((a, b) => b.rank - a.rank)
        .map(({ pose, j }) => (
          <OpponentCar key={j} pose={pose} index={j} scale={placed.scale} transitionMs={transitionMs} />
        ))}
      <PlayerCar
        pose={placed.player}
        spriteHref={vehicleSprite(vehicleId)}
        scale={placed.scale}
        transitionMs={transitionMs}
        showTag={!compact}
        trail={showOverlays && running}
        smoking={showOverlays && placed.pull > 0}
      />
      {showOverlays && <StartLights x={anchors.lights.x} y={anchors.lights.y} progress={p} />}
      {showOverlays && finished && (
        <FinishFlag x={anchors.flag.x} y={anchors.flag.y} patternId={patternId} />
      )}
    </svg>
  );
}
