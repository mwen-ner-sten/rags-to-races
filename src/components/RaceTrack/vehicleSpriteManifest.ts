import { VEHICLE_DEFINITIONS } from "@/data/vehicles";

export interface VehicleSpriteAsset {
  id: string;
  name: string;
  tier: number;
  src: string;
  width: number;
  height: number;
  anchor: {
    x: number;
    y: number;
  };
}

export const VEHICLE_SPRITE_SIZE = 64;
export const VEHICLE_TRACK_SPRITE_SIZE = 24;

export const VEHICLE_SPRITE_MANIFEST: Record<string, VehicleSpriteAsset> =
  Object.fromEntries(
    VEHICLE_DEFINITIONS.map((vehicle) => [
      vehicle.id,
      {
        id: vehicle.id,
        name: vehicle.name,
        tier: vehicle.tier,
        src: `/sprites/vehicles/${vehicle.id}.png`,
        width: VEHICLE_SPRITE_SIZE,
        height: VEHICLE_SPRITE_SIZE,
        anchor: { x: VEHICLE_SPRITE_SIZE / 2, y: VEHICLE_SPRITE_SIZE / 2 },
      },
    ]),
  );

export function getVehicleSpriteAsset(
  vehicleId: string | undefined,
): VehicleSpriteAsset | undefined {
  if (!vehicleId) return undefined;
  return VEHICLE_SPRITE_MANIFEST[vehicleId];
}
