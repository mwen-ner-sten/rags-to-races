"use client";

import {
  OVAL,
  STRIP,
  ovalOutline,
  ovalPath,
  stripLaneHeight,
  type TrackShape,
} from "./trackGeometry";

export const VENUES = ["backyard", "dirt", "county_fair", "regional", "state"] as const;
export type Venue = (typeof VENUES)[number];

export function normalizeVenue(venueId: string): Venue {
  return (VENUES as readonly string[]).includes(venueId) ? (venueId as Venue) : "backyard";
}

interface SurfaceProps {
  shape: TrackShape;
  field: number;
  /** id of the checkered pattern in the parent's <defs> */
  patternId: string;
}

const HALF = OVAL.width / 2;

function OvalSurface() {
  const left = OVAL.cx - OVAL.straight / 2;
  return (
    <>
      <path d={ovalPath(-HALF)} className="tk-infield" />
      <path d={ovalPath(0)} className="tk-surface" strokeWidth={OVAL.width} fill="none" />
      <g className="tk-edge-clean" fill="none">
        <path d={ovalPath(HALF)} className="tk-curb-a" />
        <path d={ovalPath(HALF)} className="tk-curb-b" />
        <path d={ovalPath(-HALF)} className="tk-curb-a" />
        <path d={ovalPath(-HALF)} className="tk-curb-b" />
      </g>
      <g className="tk-edge-rough" fill="none">
        <path d={ovalOutline(HALF, 0.8, 0.4)} className="tk-pencil" />
        <path d={ovalOutline(HALF - 1.5, 0.8, 2.1)} className="tk-pencil tk-pencil-faint" />
        <path d={ovalOutline(-HALF, 0.8, 1.3)} className="tk-pencil" />
        <path d={ovalOutline(-HALF + 1.5, 0.8, 3.7)} className="tk-pencil tk-pencil-faint" />
      </g>
      <path d={ovalPath(0)} className="tk-center" fill="none" />
      <rect
        x={left - 2}
        y={OVAL.cy - OVAL.radius - HALF}
        width={4}
        height={OVAL.width}
        className="tk-line"
      />
    </>
  );
}

function StripSurface({ field, patternId }: { field: number; patternId: string }) {
  const laneH = stripLaneHeight(field);
  const half = (field * laneH) / 2;
  const top = STRIP.cy - half;
  const dividers = Array.from({ length: field - 1 }, (_, i) => top + (i + 1) * laneH);
  const width = STRIP.x1 - STRIP.x0 + 70;
  return (
    <>
      <rect x={STRIP.x0 - 40} y={top} width={width} height={half * 2} className="tk-surface-fill" />
      {dividers.map((y) => (
        <line key={y} x1={STRIP.x0 - 40} x2={STRIP.x1 + 30} y1={y} y2={y} className="tk-center" />
      ))}
      <line x1={STRIP.x0 - 40} x2={STRIP.x1 + 30} y1={top} y2={top} className="tk-strip-edge" />
      <line x1={STRIP.x0 - 40} x2={STRIP.x1 + 30} y1={top + half * 2} y2={top + half * 2} className="tk-strip-edge" />
      <rect x={STRIP.x0 - 2} y={top} width={4} height={half * 2} className="tk-line" />
      <rect x={STRIP.x1 - 4} y={top} width={8} height={half * 2} fill={`url(#${patternId})`} />
    </>
  );
}

export function Surface({ shape, field, patternId }: SurfaceProps) {
  return shape === "strip" ? <StripSurface field={field} patternId={patternId} /> : <OvalSurface />;
}

// Scenery ---------------------------------------------------------------------------------------

function Stands({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const dots = Math.floor((w - 8) / 9);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} className="tk-d-a" />
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i} cx={x + 8 + i * 9} cy={y + h / 2} r={2} className={i % 3 === 0 ? "tk-d-c" : "tk-d-b"} />
      ))}
    </g>
  );
}

function Fence({ y, x1, x2 }: { y: number; x1: number; x2: number }) {
  const posts = Math.floor((x2 - x1) / 16);
  return (
    <g className="tk-d-line">
      <line x1={x1} x2={x2} y1={y} y2={y} />
      {Array.from({ length: posts + 1 }, (_, i) => (
        <line key={i} x1={x1 + i * 16} x2={x1 + i * 16} y1={y - 4} y2={y + 4} />
      ))}
    </g>
  );
}

function Tires({ y, x1, x2 }: { y: number; x1: number; x2: number }) {
  const count = Math.floor((x2 - x1) / 13);
  return (
    <g>
      {Array.from({ length: count + 1 }, (_, i) => (
        <circle key={i} cx={x1 + i * 13} cy={y} r={4.5} className="tk-d-a" />
      ))}
    </g>
  );
}

function Tree({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className="tk-d-a" />
      <circle cx={x} cy={y} r={r * 0.35} className="tk-d-b" />
    </g>
  );
}

function FerrisWheel({ x, y }: { x: number; y: number }) {
  return (
    <g className="tk-d-line" fill="none">
      <circle cx={x} cy={y} r={14} />
      <line x1={x - 14} x2={x + 14} y1={y} y2={y} />
      <line x1={x} x2={x} y1={y - 14} y2={y + 14} />
      <line x1={x - 10} x2={x + 10} y1={y - 10} y2={y + 10} />
      <line x1={x + 10} x2={x - 10} y1={y - 10} y2={y + 10} />
    </g>
  );
}

function LightPole({ x }: { x: number }) {
  return (
    <g>
      <line x1={x} x2={x} y1={4} y2={26} className="tk-d-line" />
      <circle cx={x} cy={5} r={3} className="tk-d-b" />
    </g>
  );
}

function OvalDecor({ venue }: { venue: Venue }) {
  switch (venue) {
    case "backyard":
      return (
        <>
          <Fence y={13} x1={70} x2={330} />
          <Tree x={44} y={36} r={11} />
          <Tree x={356} y={168} r={13} />
          <Tree x={64} y={172} r={8} />
        </>
      );
    case "dirt":
      return (
        <>
          <Tires y={186} x1={92} x2={308} />
          <Tires y={12} x1={150} x2={250} />
        </>
      );
    case "county_fair":
      return (
        <>
          <Stands x={95} y={5} w={210} h={15} />
          <FerrisWheel x={352} y={34} />
        </>
      );
    case "regional":
      return (
        <>
          <Stands x={95} y={5} w={210} h={15} />
          <Fence y={186} x1={70} x2={330} />
        </>
      );
    default:
      return (
        <>
          <Stands x={80} y={3} w={240} h={19} />
          <LightPole x={50} />
          <LightPole x={350} />
          <Fence y={186} x1={70} x2={330} />
        </>
      );
  }
}

function StripDecor({ venue, y }: { venue: Venue; y: number }) {
  if (venue === "backyard") return <Fence y={y + 6} x1={50} x2={350} />;
  if (venue === "dirt") return <Tires y={y + 6} x1={50} x2={350} />;
  return <Stands x={50} y={y} w={300} h={12} />;
}

export function Decor({ venue, shape, field }: { venue: Venue; shape: TrackShape; field: number }) {
  if (shape === "oval") return <OvalDecor venue={venue} />;
  return <StripDecor venue={venue} y={STRIP.cy + (field * stripLaneHeight(field)) / 2 + 26} />;
}
