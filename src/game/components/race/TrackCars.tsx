"use client";

import type { ReactNode } from "react";
import type { Pose } from "./trackGeometry";

const PLAYER_SPRITE_SIZE = 26;
const OPPONENT_COLOURS = 5;

interface FrameProps {
  pose: Pose;
  scale: number;
  transitionMs: number;
  /** Drawn in the car's moving frame but not rotated (name tag, smoke). */
  upright?: ReactNode;
  children: ReactNode;
}

/**
 * Two nested groups: the outer one carries the position, the inner one the heading. Both are CSS
 * transforms, so the live view can ease between 500 ms updates and the replay can set them every frame.
 */
function CarFrame({ pose, scale, transitionMs, upright, children }: FrameProps) {
  const transition = transitionMs > 0 ? `transform ${transitionMs}ms linear` : "none";
  return (
    <g className="tk-car" style={{ transform: `translate(${pose.x}px, ${pose.y}px)`, transition }}>
      <g style={{ transform: `rotate(${pose.heading}deg) scale(${scale})`, transition }}>{children}</g>
      {upright}
    </g>
  );
}

interface OpponentProps {
  pose: Pose;
  index: number;
  scale: number;
  transitionMs: number;
}

export function OpponentCar({ pose, index, scale, transitionMs }: OpponentProps) {
  const colour = (index % OPPONENT_COLOURS) + 1;
  return (
    <CarFrame pose={pose} scale={scale} transitionMs={transitionMs}>
      <g className="tk-car-art">
        <rect x={-9} y={-4.2} width={18} height={8.4} rx={2.4} className={`tk-car-body tk-opp-${colour}`} />
        <rect x={-1.5} y={-3} width={5} height={6} rx={1} className="tk-car-glass" />
        <rect x={-7.5} y={-5.2} width={4.5} height={1.8} rx={0.6} className="tk-car-wheel" />
        <rect x={-7.5} y={3.4} width={4.5} height={1.8} rx={0.6} className="tk-car-wheel" />
        <rect x={3.8} y={-5.2} width={4.5} height={1.8} rx={0.6} className="tk-car-wheel" />
        <rect x={3.8} y={3.4} width={4.5} height={1.8} rx={0.6} className="tk-car-wheel" />
      </g>
    </CarFrame>
  );
}

interface PlayerProps {
  pose: Pose;
  spriteHref: string;
  scale: number;
  transitionMs: number;
  showTag: boolean;
  trail: boolean;
  smoking: boolean;
}

const PUFFS = [0, 1, 2, 3];

export function PlayerCar({ pose, spriteHref, scale, transitionMs, showTag, trail, smoking }: PlayerProps) {
  const upright = (
    <>
      {showTag && (
        <text y={-15 * scale} textAnchor="middle" className="tk-you-tag">
          you
        </text>
      )}
      {smoking && (
        <g className="tk-smokes">
          {PUFFS.slice(0, 3).map((i) => (
            <circle key={i} r={4} className="tk-smoke" style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
        </g>
      )}
    </>
  );
  return (
    <CarFrame pose={pose} scale={scale} transitionMs={transitionMs} upright={upright}>
      {trail && (
        <g className="tk-puffs">
          {PUFFS.map((i) => (
            <circle key={i} r={1.8} className="tk-puff" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </g>
      )}
      <ellipse rx={15} ry={9} className="tk-you-ring" />
      <image
        href={spriteHref}
        x={-PLAYER_SPRITE_SIZE / 2}
        y={-PLAYER_SPRITE_SIZE / 2}
        width={PLAYER_SPRITE_SIZE}
        height={PLAYER_SPRITE_SIZE}
        preserveAspectRatio="xMidYMid meet"
      />
    </CarFrame>
  );
}
