/**
 * Pure geometry for the race track. No DOM: positions are computed analytically (a stadium oval or a
 * straight strip) so the same math runs on the server, in the browser and in tests.
 *
 * Conventions: SVG user units (y down). Distances are arc lengths from the start line, travelling
 * clockwise on the oval and left to right on the strip. `lateral` shifts a car off the racing line:
 * on the oval positive is outward (away from the infield), on the strip positive is down.
 * Headings are degrees and are unwrapped (they keep growing every lap), so a CSS transition between
 * two headings always takes the short way round and never flips by 180 degrees.
 */

export type TrackShape = "oval" | "strip";

export interface Pose {
  x: number;
  y: number;
  heading: number;
}

export interface LanePlan {
  /** Lateral position of the player's car on the racing grid. */
  player: number;
  /** Lateral position of each opponent, indexed by opponent number (best first). */
  opponents: number[];
  /** Where a stopped car ends up (the infield, or beside the strip). */
  pulloff: number;
  /** Scale applied to car art so a crowded strip still fits its lanes. */
  carScale: number;
}

export const OVAL = { cx: 200, cy: 100, radius: 55, straight: 170, width: 36 } as const;
export const STRIP = { x0: 70, x1: 350, cy: 100, maxLaneH: 18, maxHeight: 120 } as const;

export const MIN_FIELD = 2;
export const MAX_FIELD = 10;
const OVAL_LANE = 9;
const START_BACK = 8; // how far behind the line the front row sits before the start
const GRID_RAMP = 0.05; // fraction of the race over which the grid opens into the race spread

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function clampField(size: number): number {
  return clamp(Math.round(Number.isFinite(size) ? size : 6), MIN_FIELD, MAX_FIELD);
}

export function ovalLength(): number {
  return 2 * OVAL.straight + TAU * OVAL.radius;
}

export function stripLaneHeight(field: number): number {
  return Math.min(STRIP.maxLaneH, STRIP.maxHeight / field);
}

/** Length of one lap. */
export function trackLength(shape: TrackShape): number {
  return shape === "strip" ? STRIP.x1 - STRIP.x0 : ovalLength();
}

function ovalPose(s: number, lateral: number): Pose {
  const { cx, cy, radius: r, straight: len } = OVAL;
  const perimeter = ovalLength();
  const lap = Math.floor(s / perimeter);
  const t = s - lap * perimeter;
  const arc = Math.PI * r;
  const half = len / 2;
  const base = lap * 360;
  if (t < len) return { x: cx - half + t, y: cy - r - lateral, heading: base };
  if (t < len + arc) {
    const a = -Math.PI / 2 + (t - len) / r;
    return {
      x: cx + half + (r + lateral) * Math.cos(a),
      y: cy + (r + lateral) * Math.sin(a),
      heading: base + a * DEG + 90,
    };
  }
  if (t < 2 * len + arc) return { x: cx + half - (t - len - arc), y: cy + r + lateral, heading: base + 180 };
  const a = Math.PI / 2 + (t - 2 * len - arc) / r;
  return {
    x: cx - half + (r + lateral) * Math.cos(a),
    y: cy + (r + lateral) * Math.sin(a),
    heading: base + a * DEG + 90,
  };
}

function stripPose(s: number, lateral: number): Pose {
  return { x: STRIP.x0 + s, y: STRIP.cy + lateral, heading: 0 };
}

export function carPose(shape: TrackShape, s: number, lateral: number): Pose {
  return shape === "strip" ? stripPose(s, lateral) : ovalPose(s, lateral);
}

/** Lateral slots for a field of `field` cars: the player keeps the centre, opponents flank them. */
export function lanePlan(shape: TrackShape, field: number): LanePlan {
  if (shape === "oval") {
    const opponents = Array.from({ length: field - 1 }, (_, j) => (j % 2 === 0 ? -OVAL_LANE : OVAL_LANE));
    return { player: 0, opponents, pulloff: -(OVAL.width / 2 + 10), carScale: 1 };
  }
  const laneH = stripLaneHeight(field);
  const lane = (i: number) => (i - (field - 1) / 2) * laneH;
  const playerIndex = Math.floor((field - 1) / 2);
  const opponents = Array.from({ length: field - 1 }, (_, j) => lane(j < playerIndex ? j : j + 1));
  return {
    player: lane(playerIndex),
    opponents,
    pulloff: (field * laneH) / 2 + 12,
    carScale: Math.min(1, (laneH - 1.5) / 16),
  };
}

/** Distance between consecutive ranks. Starts as a tight grid, opens up, then bunches toward the flag. */
export function rankGap(shape: TrackShape, progress: number): number {
  if (shape === "strip") return 0;
  const grid = 14;
  const open = 22;
  if (progress < 0.06) return grid + (open - grid) * (progress / 0.06);
  return open - 6 * ((progress - 0.06) / 0.94);
}

/**
 * Distance of the car at `rank` (1 = leader, fractional ranks are fine). The leader reaches exactly
 * laps * trackLength at progress 1. Before the start every car sits behind the line.
 */
export function carDistance(shape: TrackShape, rank: number, progress: number, laps: number): number {
  const p = clamp(progress, 0, 1);
  const back = START_BACK * (1 - Math.min(1, p / GRID_RAMP));
  const total = p * laps * trackLength(shape);
  if (shape === "strip") {
    // Lanes are side by side, so trailing cars fall behind in proportion rather than by a fixed gap.
    const k = 0.035 * (1 - 0.5 * p);
    return total * (1 - (rank - 1) * k) - back;
  }
  return total - (rank - 1) * rankGap(shape, p) - back;
}

/**
 * Rank occupied by opponent `j` (0 = best) when the player is at (possibly fractional) `playerRank`.
 * Opponents step aside smoothly as the player passes through their slot, so nothing jumps.
 */
export function opponentRank(j: number, playerRank: number): number {
  return j + 1 + clamp(j + 2 - playerRank, 0, 1);
}

/** Closed outline of the oval at a lateral offset. A small wobble gives the pencil-drawn look. */
export function ovalOutline(lateral: number, wobble: number, phase: number): string {
  const perimeter = ovalLength();
  const steps = Math.ceil(perimeter / 6);
  const points: string[] = [];
  for (let i = 0; i < steps; i++) {
    const s = (i / steps) * perimeter;
    const a = (s / perimeter) * TAU;
    const w = wobble * (Math.sin(a * 37 + phase) + 0.6 * Math.sin(a * 91 + phase * 2));
    const pose = ovalPose(s, lateral + w);
    points.push(`${i === 0 ? "M" : "L"}${pose.x.toFixed(1)},${pose.y.toFixed(1)}`);
  }
  return `${points.join(" ")} Z`;
}

/** Exact stadium path (arcs) at a lateral offset. */
export function ovalPath(lateral: number): string {
  const { cx, cy, radius, straight } = OVAL;
  const r = radius + lateral;
  const l = cx - straight / 2;
  const rr = cx + straight / 2;
  return `M${l},${cy - r} L${rr},${cy - r} A${r},${r} 0 0 1 ${rr},${cy + r} L${l},${cy + r} A${r},${r} 0 0 1 ${l},${cy - r} Z`;
}

export function viewBoxFor(shape: TrackShape, field: number, compact: boolean): string {
  if (shape === "strip") {
    const half = (field * stripLaneHeight(field)) / 2;
    return compact
      ? `0 ${STRIP.cy - half - 10} 400 ${2 * half + 32}`
      : `0 ${STRIP.cy - half - 44} 400 ${2 * half + 88}`;
  }
  return compact ? "0 22 400 156" : "0 0 400 200";
}
