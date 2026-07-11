import Image from "next/image";
import { getVehicleSpriteAsset } from "./vehicleSpriteManifest";

/** Shown in Dev -> Vehicle Sprites so you can confirm the running bundle has new art. */
export const VEHICLE_SPRITE_ART_REVISION = 4;

interface VehicleSpriteProps {
  vehicleId: string;
  size?: number;
  color?: string;
  className?: string;
}

function MissingVehicleSprite({
  size,
  color,
  className,
}: {
  size: number;
  color: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", shapeRendering: "crispEdges" }}
      aria-label="Missing vehicle sprite"
    >
      <rect x={4} y={4} width={56} height={56} fill="rgba(0,0,0,.65)" />
      <path d="M16 20h32v24H16z" fill={color} opacity={0.35} />
      <path d="M20 20l24 24M44 20 20 44" stroke="#ff4d4d" strokeWidth={5} />
    </svg>
  );
}

export default function VehicleSprite({
  vehicleId,
  size = 64,
  color = "var(--accent)",
  className,
}: VehicleSpriteProps) {
  const sprite = getVehicleSpriteAsset(vehicleId);

  if (!sprite) {
    return <MissingVehicleSprite size={size} color={color} className={className} />;
  }

  return (
    <Image
      src={sprite.src}
      alt={`${sprite.name} sprite`}
      width={size}
      height={size}
      unoptimized
      className={className}
      style={{
        display: "block",
        imageRendering: "pixelated",
        maxWidth: "100%",
        width: size,
        height: "auto",
      }}
    />
  );
}
