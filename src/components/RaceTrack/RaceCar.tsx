import { getVehicleSprite, getOpponentSprite } from "./vehicleSprites";

interface RaceCarProps {
  rank: number;
  isPlayer: boolean;
  isMechanical: boolean;
  vehicleTier: number;
  carRef: (el: SVGGElement | null) => void;
}

export default function RaceCar({
  rank,
  isPlayer,
  isMechanical,
  vehicleTier,
  carRef,
}: RaceCarProps) {
  const totalRacers = 8;
  const spritePath = isPlayer
    ? getVehicleSprite(vehicleTier)
    : getOpponentSprite();

  return (
    <g
      ref={carRef}
      style={{
        transition: "transform 80ms linear",
        willChange: "transform",
      }}
    >
      <path
        d={spritePath}
        fill={isPlayer ? "var(--accent)" : "var(--text-muted)"}
        opacity={
          isPlayer
            ? isMechanical
              ? 0.4
              : 1
            : 0.3 + (totalRacers - rank) * 0.06
        }
        filter={isPlayer ? "url(#player-glow)" : undefined}
        style={
          isPlayer && isMechanical
            ? { animation: "shake 0.3s infinite" }
            : undefined
        }
        stroke={isPlayer ? "var(--accent)" : "none"}
        strokeWidth={isPlayer ? 0.5 : 0}
      />
    </g>
  );
}
