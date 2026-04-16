/**
 * SVG path data for top-down vehicle silhouettes per tier.
 * All sprites are drawn in ~20x12 local coordinate space,
 * centered at origin, pointing right (positive X).
 */

const VEHICLE_SPRITES: Record<number, string> = {
  // T0 — Push Mower: boxy rectangle with handle bar sticking up-left
  0: "M -5,-3 L 5,-3 L 6,-1 L 6,1 L 5,3 L -5,3 L -5,-3 Z M -5,-5 L -4,-5 L -4,-3 M -5,5 L -4,5 L -4,3",

  // T1 — Riding Mower: wider body with a seat bump on top
  1: "M -6,-3.5 L 5,-3.5 L 6.5,-2 L 6.5,2 L 5,3.5 L -6,3.5 Z M -2,-5.5 L 1,-5.5 L 1,-3.5 L -2,-3.5 Z",

  // T2 — Go-Kart: low-slung with open wheel gaps and a roll bar hoop
  2: "M -7,-2 L 6,-2 L 7.5,0 L 6,2 L -7,2 Z M -5,-4 L -3,-4 L -3,-2 M -5,4 L -3,4 L -3,2 M 4,-4 L 6,-4 L 6,-2 M 4,4 L 6,4 L 6,2 M -1,-3.5 C 0,-4.5 1,-4.5 2,-3.5",

  // T3 — Beater Car: classic boxy sedan, rough edges
  3: "M -8,-3 L 6,-3 L 7.5,-2 L 8,-1 L 8,1 L 7.5,2 L 6,3 L -8,3 L -8.5,2 L -8.5,-2 Z M -4,-4.5 L 3,-4.5 L 4,-3 L -5,-3 Z",

  // T4 — Street Racer: sleeker sedan with spoiler lip
  4: "M -8,-2.5 L 6.5,-2.5 L 8,-1.5 L 8.5,0 L 8,-1.5 L 8,1.5 L 6.5,2.5 L -8,2.5 L -8.5,1.5 L -8.5,-1.5 Z M -5,-4 L 3.5,-4 L 5,-2.5 L -6,-2.5 Z M -8.5,-3.5 L -7,-3.5 L -7,-2.5",

  // T5 — Rally Car: like T4 with roof scoop and taller ride
  5: "M -8,-3 L 7,-3 L 8.5,-1.5 L 8.5,1.5 L 7,3 L -8,3 L -9,1.5 L -9,-1.5 Z M -4,-5 L 4,-5 L 5.5,-3 L -5.5,-3 Z M 0,-6.5 L 2,-6.5 L 2,-5 L 0,-5 Z",

  // T6 — Stock Car: long low wedge, flat roof, big rear spoiler
  6: "M -9,-3 L 7.5,-3 L 9,-1.5 L 9,1.5 L 7.5,3 L -9,3 L -9.5,1.5 L -9.5,-1.5 Z M -5,-4.5 L 5,-4.5 L 6.5,-3 L -6,-3 Z M -9.5,-4.5 L -8,-4.5 L -8,-3 L -9.5,-3 Z",

  // T7 — Prototype Racer: open-cockpit, tall rear fin, rear wing
  7: "M -9,-2.5 L 8,-2.5 L 9.5,-1 L 9.5,1 L 8,2.5 L -9,2.5 L -10,1 L -10,-1 Z M -1,-4 L 2,-4 L 2,-2.5 L -1,-2.5 Z M -9,-5 L -7.5,-5 L -7.5,-2.5 M -10,-4 L -8,-4 L -8,-3",

  // T8 — Supercar: smooth sculpted profile, mid-engine bubble
  8: "M -9,-2.5 C -7,-3.5 7,-3.5 9.5,-1.5 L 10,0 L 9.5,1.5 C 7,3.5 -7,3.5 -9,2.5 Z M -3,-4 C -1,-5 2,-5 3.5,-4 L 3.5,-3 L -3,-3 Z M 3,-4 C 4,-4.5 6,-4.5 7,-3.5",
};

/** Generic opponent car shape (simplified sedan) */
const OPPONENT_SPRITE =
  "M -6,-2.5 L 5,-2.5 L 6.5,-1.5 L 7,0 L 6.5,1.5 L 5,2.5 L -6,2.5 L -6.5,1.5 L -6.5,-1.5 Z";

/** Get vehicle sprite path for a given tier. Falls back to T0. */
export function getVehicleSprite(tier: number): string {
  return VEHICLE_SPRITES[tier] ?? VEHICLE_SPRITES[0];
}

/** Get the generic opponent car sprite */
export function getOpponentSprite(): string {
  return OPPONENT_SPRITE;
}
