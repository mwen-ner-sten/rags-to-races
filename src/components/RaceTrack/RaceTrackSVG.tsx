"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { RaceEvent } from "@/engine/raceEvents";
import TrackSurface from "./TrackSurface";
import RaceCar from "./RaceCar";
import RaceParticles from "./RaceParticles";
import { StartSequence, FinishOverlay } from "./RaceOverlays";
import { getCircuitTheme } from "./circuitThemes";

interface RaceTrackSVGProps {
  progress: number;
  playerPosition: number;
  eventType: RaceEvent["type"] | null;
  vehicleTier?: number;
  circuitId?: string;
  raceDuration?: number;
}

const TOTAL_RACERS = 8;

// Stadium-shaped track path: two straights connected by semicircles
const TRACK_PATH =
  "M 120,40 L 280,40 A 60,60 0 0 1 280,160 L 120,160 A 60,60 0 0 1 120,40 Z";

// Start/finish line position (top-left of the track)
const FINISH_LINE = { x: 120, y1: 22, y2: 58 };

export default function RaceTrackSVG({
  progress,
  playerPosition,
  eventType,
  vehicleTier = 0,
  circuitId = "backyard_derby",
  raceDuration = 4000,
}: RaceTrackSVGProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const carRefs = useRef<(SVGGElement | null)[]>([]);
  const lengthRef = useRef(0);
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

    const endSpread = maxSpread * 0.3;
    const usableLength = totalLength - endSpread;
    const baseDistance = progress * usableLength;

    for (let i = 0; i < TOTAL_RACERS; i++) {
      const el = carRefs.current[i];
      if (!el) continue;

      const rank = i;
      const positionOffset =
        ((TOTAL_RACERS - 1 - rank) / (TOTAL_RACERS - 1)) * currentSpread;
      const distance = Math.min(
        totalLength - 2,
        Math.max(0, baseDistance + positionOffset),
      );

      const pt = path.getPointAtLength(distance);
      const pt2 = path.getPointAtLength(Math.min(totalLength - 1, distance + 3));
      const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI);

      el.style.transform = `translate(${pt.x}px, ${pt.y}px) rotate(${angle}deg)`;

      // Track player position for particles
      if (rank === playerPosition - 1) {
        setPlayerPos({ x: pt.x, y: pt.y });
      }
    }
  }, [progress, playerPosition]);

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
          (rank) => (
            <RaceCar
              key={rank}
              rank={rank}
              isPlayer={rank === playerIndex}
              isMechanical={rank === playerIndex && isMechanical}
              vehicleTier={vehicleTier}
              carRef={setCarRef(rank)}
            />
          ),
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
