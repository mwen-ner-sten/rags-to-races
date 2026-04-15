"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { sprites } from "@/components/RaceTrack/VehicleSprite";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import type { RaceEvent } from "@/engine/raceEvents";
import TrackSurface from "./TrackSurface";
import RaceParticles from "./RaceParticles";
import { StartSequence, FinishOverlay } from "./RaceOverlays";
import { getCircuitTheme } from "./circuitThemes";

interface RaceTrackSVGProps {
  progress: number;
  playerPosition: number;
  eventType: RaceEvent["type"] | null;
  playerVehicleId?: string;
  circuitMinTier?: number;
  circuitMaxTier?: number;
  circuitId?: string;
  raceDuration?: number;
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
  circuitId = "backyard_derby",
  raceDuration = 4000,
}: RaceTrackSVGProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const carRefs = useRef<(SVGGElement | null)[]>([]);
  const lengthRef = useRef(0);
  const prevAngles = useRef<number[]>(new Array(TOTAL_RACERS).fill(0));
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 120, y: 40 });

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
      // Compute tangent angle using a wider sample for stability at curve transitions.
      const sampleDelta = 8;
      const dBack = Math.max(0, distance - sampleDelta);
      const dFwd = Math.min(totalLength - 0.1, distance + sampleDelta);
      const ptBack = path.getPointAtLength(dBack);
      const ptFwd = path.getPointAtLength(dFwd);
      const rawAngle = Math.atan2(ptFwd.y - ptBack.y, ptFwd.x - ptBack.x) * (180 / Math.PI);

      // Unwrap angle relative to previous frame so CSS transition always takes
      // the shortest rotational path (prevents ±180° flip at bottom straight).
      let angle = rawAngle;
      const prev = prevAngles.current[i];
      while (angle - prev > 180) angle -= 360;
      while (angle - prev < -180) angle += 360;
      prevAngles.current[i] = angle;

      el.style.transform = `translate(${pt.x}px, ${pt.y}px) rotate(${angle}deg)`;

      // Track player position for particles
      if (rank === playerPosition - 1) {
        setPlayerPos({ x: pt.x, y: pt.y });
      }
    }
  }, [progress, playerPosition]);

  // Map player into the sorted array: index = playerPosition - 1
  const playerIndex = playerPosition - 1;
  const isMechanical = eventType === "mechanical";
  const circuitTheme = getCircuitTheme(circuitId);

  const setCarRef = useCallback((rank: number) => (el: SVGGElement | null) => {
    carRefs.current[rank] = el;
  }, []);

  return (
    <div className="w-full" style={{ minHeight: 100 }}>
      <svg
        viewBox="0 0 400 200"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        aria-label="Race track"
      >
        {/* Glow filter for player car */}
        <defs>
          <filter id="player-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="var(--accent)" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Circuit-themed track surface, curbs, decorations */}
        <TrackSurface
          circuitId={circuitId}
          trackPath={TRACK_PATH}
          finishLine={FINISH_LINE}
        />

        {/* Hidden path for getPointAtLength */}
        <path
          ref={pathRef}
          d={TRACK_PATH}
          fill="none"
          stroke="none"
        />

        {/* Particle effects */}
        <RaceParticles
          progress={progress}
          eventType={eventType}
          playerX={playerPos.x}
          playerY={playerPos.y}
          ambientParticles={circuitTheme.ambientParticles}
        />

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
                ref={setCarRef(rank)}
                style={{
                  transition: "transform 120ms ease-out",
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
              </g>
            );
          },
        )}

        {/* Start sequence overlay (traffic lights) */}
        <StartSequence
          progress={progress}
          eventType={eventType}
          raceDuration={raceDuration}
        />

        {/* Finish overlay (checkered flag + result) */}
        <FinishOverlay eventType={eventType} />
      </svg>
    </div>
  );
}
