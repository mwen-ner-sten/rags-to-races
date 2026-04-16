/**
 * Top-down vehicle sprites (32×32), pixel-art style: integer rects only, crisp edges.
 * Body uses `currentColor` from the `color` prop (theme accent on track / dev viewer).
 */

/** Shown in Dev → Vehicle Sprites so you can confirm the running bundle has new art. */
export const VEHICLE_SPRITE_ART_REVISION = 3;

interface VehicleSpriteProps {
  vehicleId: string;
  size?: number;
  color?: string;
  className?: string;
}

type SpriteRenderer = (color: string) => React.ReactNode;

/* ── Pixel helpers (1 unit = 1 “pixel” in viewBox) ───────────────────────── */

const OUTLINE = "#0d0d0d";
const TIRE = "#242424";
const TIRE_HI = "#3d3d3d";
const CHROME = "var(--text-muted)";
/** Windshield / cabin glass — reads on any theme */
const GLASS =
  "color-mix(in srgb, var(--panel-bg) 62%, rgb(120, 180, 220) 38%)";
const RALLY_LAMP = "#f4e8a0";
const HEADLIGHT = "#eef4ff";

function R(x: number, y: number, w: number, h: number, fill: string) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} />;
}

/** Darker body shade (works when parent sets `color` to vehicle paint). */
const DARK = "color-mix(in srgb, currentColor 48%, #000)";
const MID = "color-mix(in srgb, currentColor 68%, #000)";
const LIGHT = "color-mix(in srgb, currentColor 82%, #fff)";

function wheel4(x: number, y: number) {
  return (
    <g>
      {R(x + 1, y, 2, 1, OUTLINE)}
      {R(x, y + 1, 4, 2, OUTLINE)}
      {R(x + 1, y + 1, 2, 2, TIRE)}
      {R(x + 1, y + 1, 1, 1, TIRE_HI)}
      {R(x + 2, y + 2, 1, 1, TIRE_HI)}
    </g>
  );
}

function wheel5(x: number, y: number) {
  return (
    <g>
      {R(x + 1, y, 3, 1, OUTLINE)}
      {R(x, y + 1, 5, 3, OUTLINE)}
      {R(x + 1, y + 1, 3, 3, TIRE)}
      {R(x + 1, y + 1, 1, 1, TIRE_HI)}
      {R(x + 3, y + 1, 1, 1, TIRE_HI)}
      {R(x + 2, y + 2, 1, 1, TIRE_HI)}
      {R(x + 1, y + 3, 1, 1, TIRE_HI)}
      {R(x + 3, y + 3, 1, 1, TIRE_HI)}
    </g>
  );
}

function shadowStrip() {
  return (
    <g opacity={0.45}>
      {R(6, 26, 20, 1, "#000")}
      {R(5, 27, 22, 1, "#000")}
      {R(6, 28, 20, 1, "#000")}
    </g>
  );
}

function bodyWrap(color: string, children: React.ReactNode) {
  return (
    <g style={{ color }} shapeRendering="crispEdges">
      {children}
    </g>
  );
}

/* ── Per-vehicle pixel layouts (+X = front / nose of vehicle) ───────────── */

export const sprites: Record<string, SpriteRenderer> = {
  push_mower: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel4(6, 6)}
        {wheel4(6, 22)}
        {R(3, 14, 2, 4, CHROME)}
        {R(5, 15, 5, 2, CHROME)}
        {R(10, 10, 12, 12, OUTLINE)}
        {R(11, 11, 10, 10, "currentColor")}
        {R(19, 12, 4, 8, MID)}
        {R(12, 12, 6, 3, LIGHT)}
        {R(14, 15, 6, 5, DARK)}
        {R(15, 16, 4, 3, MID)}
        {R(16, 17, 2, 1, OUTLINE)}
        {R(22, 13, 2, 6, DARK)}
        {R(23, 14, 1, 4, LIGHT)}
        {R(24, 15, 3, 2, CHROME)}
      </>
    )),

  riding_mower: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel5(5, 4)}
        {wheel5(5, 21)}
        {wheel4(22, 7)}
        {wheel4(22, 21)}
        {R(9, 8, 14, 16, OUTLINE)}
        {R(10, 9, 12, 14, "currentColor")}
        {R(11, 10, 10, 4, LIGHT)}
        {R(19, 10, 5, 12, MID)}
        {R(20, 11, 3, 10, DARK)}
        {R(11, 14, 5, 7, GLASS)}
        {R(12, 15, 3, 5, "color-mix(in srgb, var(--panel-bg) 40%, #000)")}
        {R(16, 15, 3, 1, CHROME)}
        {R(19, 15, 2, 1, CHROME)}
        {R(20, 16, 1, 1, OUTLINE)}
      </>
    )),

  go_kart: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel5(3, 4)}
        {wheel5(3, 21)}
        {wheel4(23, 7)}
        {wheel4(23, 21)}
        {R(6, 7, 1, 18, CHROME)}
        {R(9, 11, 16, 10, OUTLINE)}
        {R(10, 12, 14, 8, "currentColor")}
        {R(11, 13, 6, 6, DARK)}
        {R(12, 14, 4, 4, GLASS)}
        {R(18, 13, 5, 6, MID)}
        {R(23, 13, 6, 6, OUTLINE)}
        {R(24, 14, 4, 4, "currentColor")}
        {R(25, 15, 2, 2, LIGHT)}
        {R(13, 10, 4, 1, CHROME)}
        {R(13, 21, 4, 1, CHROME)}
      </>
    )),

  beater_car: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel4(5, 5)}
        {wheel4(5, 21)}
        {wheel4(22, 5)}
        {wheel4(22, 21)}
        {R(7, 9, 19, 14, OUTLINE)}
        {R(8, 10, 17, 12, "currentColor")}
        {R(9, 11, 4, 4, GLASS)}
        {R(20, 11, 4, 4, GLASS)}
        {R(13, 10, 6, 12, MID)}
        {R(14, 11, 4, 10, DARK)}
        {R(10, 15, 14, 2, OUTLINE)}
        {R(11, 15, 12, 1, "color-mix(in srgb, currentColor 35%, #000)")}
        {R(9, 19, 2, 1, CHROME)}
        {R(9, 20, 3, 1, CHROME)}
        {R(25, 11, 4, 2, LIGHT)}
        {R(25, 17, 4, 2, LIGHT)}
      </>
    )),

  street_racer: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel4(4, 5)}
        {wheel4(4, 21)}
        {wheel5(21, 4)}
        {wheel5(21, 21)}
        {R(6, 8, 22, 16, OUTLINE)}
        {R(7, 9, 20, 14, "currentColor")}
        {R(8, 10, 6, 12, DARK)}
        {R(9, 11, 4, 10, MID)}
        {R(19, 10, 7, 4, GLASS)}
        {R(20, 18, 6, 3, GLASS)}
        {R(14, 9, 5, 14, LIGHT)}
        {R(3, 9, 2, 14, OUTLINE)}
        {R(4, 10, 1, 12, CHROME)}
        {R(2, 11, 2, 10, CHROME)}
        {R(28, 12, 3, 2, HEADLIGHT)}
        {R(28, 18, 3, 2, HEADLIGHT)}
        {R(10, 15, 14, 1, "color-mix(in srgb, currentColor 40%, #fff)")}
      </>
    )),

  rally_car: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel5(3, 3)}
        {wheel5(3, 22)}
        {wheel5(20, 3)}
        {wheel5(20, 22)}
        {R(6, 7, 22, 18, OUTLINE)}
        {R(7, 8, 20, 16, "currentColor")}
        {R(8, 9, 6, 14, DARK)}
        {R(19, 8, 7, 5, GLASS)}
        {R(20, 19, 6, 4, GLASS)}
        {R(13, 8, 6, 16, MID)}
        {R(14, 9, 4, 14, LIGHT)}
        {R(15, 7, 4, 2, OUTLINE)}
        {R(16, 6, 2, 2, CHROME)}
        {R(15, 23, 4, 2, OUTLINE)}
        {R(16, 24, 2, 1, CHROME)}
        {R(26, 10, 2, 2, RALLY_LAMP)}
        {R(26, 18, 2, 2, RALLY_LAMP)}
        {R(9, 15, 14, 2, "#fff")}
        {R(4, 6, 2, 3, CHROME)}
        {R(4, 23, 2, 3, CHROME)}
      </>
    )),

  stock_car: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel5(3, 4)}
        {wheel5(3, 21)}
        {wheel5(20, 4)}
        {wheel5(20, 21)}
        {R(4, 7, 24, 18, OUTLINE)}
        {R(5, 8, 22, 16, "currentColor")}
        {R(6, 9, 20, 14, MID)}
        {R(7, 10, 18, 12, "currentColor")}
        {R(19, 9, 7, 5, GLASS)}
        {R(8, 11, 6, 8, DARK)}
        {R(9, 12, 4, 6, LIGHT)}
        {R(14, 13, 6, 6, OUTLINE)}
        {R(15, 14, 4, 4, "color-mix(in srgb, var(--panel-bg) 55%, #000)")}
        {R(16, 15, 2, 2, CHROME)}
        {R(2, 10, 2, 12, OUTLINE)}
        {R(3, 11, 1, 10, CHROME)}
        {R(6, 14, 20, 2, "#fff")}
        {R(6, 14, 20, 1, "color-mix(in srgb, currentColor 50%, #fff)")}
        {R(7, 11, 16, 1, LIGHT)}
      </>
    )),

  prototype_racer: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel5(2, 2)}
        {wheel5(2, 23)}
        {wheel4(23, 5)}
        {wheel4(23, 21)}
        {R(7, 9, 21, 14, OUTLINE)}
        {R(8, 10, 19, 12, "currentColor")}
        {R(9, 11, 8, 10, DARK)}
        {R(17, 11, 9, 10, MID)}
        {R(18, 12, 6, 8, GLASS)}
        {R(26, 8, 4, 16, OUTLINE)}
        {R(27, 9, 2, 14, CHROME)}
        {R(5, 10, 3, 12, OUTLINE)}
        {R(4, 11, 2, 10, CHROME)}
        {R(1, 5, 3, 22, OUTLINE)}
        {R(2, 6, 2, 20, CHROME)}
        {R(10, 8, 8, 2, LIGHT)}
        {R(10, 22, 8, 2, LIGHT)}
        {R(15, 10, 2, 2, OUTLINE)}
      </>
    )),

  supercar: (c) =>
    bodyWrap(c, (
      <>
        {shadowStrip()}
        {wheel5(3, 3)}
        {wheel5(3, 22)}
        {wheel5(20, 4)}
        {wheel5(20, 21)}
        {R(5, 7, 23, 18, OUTLINE)}
        {R(6, 8, 21, 16, "currentColor")}
        {R(7, 9, 8, 14, DARK)}
        {R(19, 8, 7, 5, GLASS)}
        {R(20, 19, 6, 4, GLASS)}
        {R(14, 8, 5, 16, MID)}
        {R(15, 9, 3, 14, LIGHT)}
        {R(1, 5, 3, 22, OUTLINE)}
        {R(2, 6, 2, 20, CHROME)}
        {R(27, 11, 3, 3, HEADLIGHT)}
        {R(27, 18, 3, 3, HEADLIGHT)}
        {R(16, 7, 3, 2, OUTLINE)}
        {R(17, 23, 3, 2, OUTLINE)}
        {R(8, 15, 16, 2, "color-mix(in srgb, currentColor 55%, #fff)")}
      </>
    )),
};

/* ── Component ──────────────────────────────────────────────────────────── */

export default function VehicleSprite({
  vehicleId,
  size = 32,
  color = "var(--accent)",
  className,
}: VehicleSpriteProps) {
  const renderer = sprites[vehicleId];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      {renderer ? (
        renderer(color)
      ) : (
        <polygon points="9,11 23,16 9,21" fill={color} />
      )}
    </svg>
  );
}
