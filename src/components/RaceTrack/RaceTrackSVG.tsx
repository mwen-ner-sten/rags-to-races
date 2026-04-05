"use client";

import { useEffect, useRef } from "react";
import { sprites } from "@/components/RaceTrack/VehicleSprite";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import type { RaceEvent } from "@/engine/raceEvents";

interface RaceTrackSVGProps {
  progress: number;
  playerPosition: number;
  eventType: RaceEvent["type"] | null;
  playerVehicleId?: string;
  circuitMinTier?: number;
  circuitMaxTier?: number;
}

const TOTAL_RACERS = 8;

// Stadium-shaped track path: two straights connected by semicircles
const TRACK_PATH =
  "M 120,40 L 280,40 A 60,60 0 0 1 280,160 L 120,160 A 60,60 0 0 1 120,40 Z";

// Start/finish line position (top-left of the track)
const FINISH_LINE = { x: 120, y1: 22, y2: 58 };

// Sprite size on track (viewBox units)
const SPRITE_SIZE = 16;
const SPRITE_HALF = SPRITE_SIZE / 2;

/** Get the vehicle ID for a given tier. */
function vehicleIdForTier(tier: number): string | undefined {
  return VEHICLE_DEFINITIONS.find((v) => v.tier === tier)?.id;
}

/** Pick a deterministic opponent vehicle ID for a given rank + circuit tier range. */
function opponentVehicleId(
  rank: number,
  minTier: number,
  maxTier: number,
): string | undefined {
  // Spread opponents across the tier range, higher ranks get lower tiers
  const tierRange = maxTier - minTier + 1;
  const tier = minTier + (rank % tierRange);
  return vehicleIdForTier(tier);
}

export default function RaceTrackSVG({
  progress,
  playerPosition,
  eventType,
  playerVehicleId,
  circuitMinTier = 0,
  circuitMaxTier = 0,
}: RaceTrackSVGProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const carRefs = useRef<(SVGGElement | null)[]>([]);
  const lengthRef = useRef(0);

  // Initialize path length once mounted
  useEffect(() => {
    if (pathRef.current) {
      lengthRef.current = pathRef.current.getTotalLength();
    }
  }, []);

  // Position cars on each update
  useEffect(() => {
    const path = pathRef.current;
    const totalLength = lengthRef.current;
    if (!path || totalLength === 0) return;

    // Spread shrinks as race progresses — pack tightens toward finish
    const maxSpread = totalLength * 0.18;
    const spreadFactor = 0.3 + 0.7 * (1 - progress);
    const currentSpread = maxSpread * spreadFactor;

    // P1 (rank 0) gets the largest offset (= currentSpread).
    // At progress=1 we want P1 to land exactly at the finish line (distance = totalLength).
    // So: usableLength = totalLength - endSpread, where endSpread = maxSpread * 0.3
    const endSpread = maxSpread * 0.3;
    const usableLength = totalLength - endSpread;
    const baseDistance = progress * usableLength;

    for (let i = 0; i < TOTAL_RACERS; i++) {
      const el = carRefs.current[i];
      if (!el) continue;

      // rank 0 = P1 (furthest ahead), rank 7 = P8
      const rank = i;
      const positionOffset =
        ((TOTAL_RACERS - 1 - rank) / (TOTAL_RACERS - 1)) * currentSpread;
      const distance = Math.min(
        totalLength - 2,
        Math.max(0, baseDistance + positionOffset),
      );

      // Get point on path
      const pt = path.getPointAtLength(distance);
      // Get direction by sampling a nearby point
      const pt2 = path.getPointAtLength(Math.min(totalLength - 1, distance + 3));
      const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI);

      el.style.transform = `translate(${pt.x}px, ${pt.y}px) rotate(${angle}deg)`;
    }
  }, [progress, playerPosition]);

  // Map player into the sorted array: index = playerPosition - 1
  const playerIndex = playerPosition - 1;
  const isMechanical = eventType === "mechanical";

  return (
    <div className="w-full" style={{ minHeight: 100 }}>
      <svg
        viewBox="0 0 400 200"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        aria-label="Race track"
      >
        {/* Track surface */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="var(--panel-border)"
          strokeWidth={38}
          strokeLinejoin="round"
        />

        {/* Track inner edge highlight */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="var(--panel-bg)"
          strokeWidth={1}
          opacity={0.3}
        />

        {/* Dashed center line */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1}
          strokeDasharray="8 6"
          opacity={0.25}
        />

        {/* Start / finish line */}
        <line
          x1={FINISH_LINE.x}
          y1={FINISH_LINE.y1}
          x2={FINISH_LINE.x}
          y2={FINISH_LINE.y2}
          stroke="var(--accent)"
          strokeWidth={2.5}
          opacity={0.6}
        />
        {/* Checkerboard ticks on finish line */}
        <line
          x1={FINISH_LINE.x}
          y1={FINISH_LINE.y1}
          x2={FINISH_LINE.x}
          y2={FINISH_LINE.y2}
          stroke="var(--text-muted)"
          strokeWidth={2.5}
          strokeDasharray="3 3"
          opacity={0.4}
        />

        {/* Hidden path for getPointAtLength */}
        <path
          ref={pathRef}
          d={TRACK_PATH}
          fill="none"
          stroke="none"
        />

        {/* Glow filter for player car */}
        <defs>
          <filter id="player-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="var(--accent)" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Cars — rendered P8 first so P1 is on top */}
        {Array.from({ length: TOTAL_RACERS }, (_, i) => TOTAL_RACERS - 1 - i).map(
          (rank) => {
            const isPlayer = rank === playerIndex;
            const color = isPlayer ? "var(--accent)" : "var(--text-muted)";
            const vId = isPlayer
              ? playerVehicleId
              : opponentVehicleId(rank, circuitMinTier, circuitMaxTier);
            const renderer = vId ? sprites[vId] : undefined;

            return (
              <g
                key={rank}
                ref={(el) => { carRefs.current[rank] = el; }}
                style={{
                  transition: "transform 80ms linear",
                  willChange: "transform",
                }}
              >
                <g
                  opacity={
                    isPlayer
                      ? isMechanical ? 0.4 : 1
                      : 0.35 + (TOTAL_RACERS - rank) * 0.05
                  }
                  filter={isPlayer ? "url(#player-glow)" : undefined}
                  style={
                    isPlayer && isMechanical
                      ? { animation: "shake 0.3s infinite" }
                      : undefined
                  }
                >
                  {renderer ? (
                    <svg
                      x={-SPRITE_HALF}
                      y={-SPRITE_HALF}
                      width={SPRITE_SIZE}
                      height={SPRITE_SIZE}
                      viewBox="0 0 32 32"
                    >
                      {renderer(color)}
                    </svg>
                  ) : (
                    <polygon
                      points={isPlayer ? "-7,-5 8,0 -7,5" : "-5,-3.5 6,0 -5,3.5"}
                      fill={color}
                    />
                  )}
                </g>
                {/* Small label for player car */}
                {isPlayer && (
                  <text
                    y={-SPRITE_HALF - 2}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="var(--font-mono)"
                    fill="var(--accent)"
                  >
                    YOU
                  </text>
                )}
              </g>
            );
          },
        )}
      </svg>
    </div>
  );
}
