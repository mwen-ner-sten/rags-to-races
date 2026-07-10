import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { getFixedAsset } from "@/assets/manifest";

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
    VEHICLE_DEFINITIONS.map((vehicle) => {
      const asset = getFixedAsset("vehicle", vehicle.id);
      if (!asset) throw new Error(`Missing vehicle asset manifest entry: ${vehicle.id}`);
      return [vehicle.id, {
        id: vehicle.id,
        name: vehicle.name,
        tier: vehicle.tier,
        src: asset.src,
        width: asset.source.width,
        height: asset.source.height,
        anchor: asset.anchor,
      }];
    }),
  );

export function getVehicleSpriteAsset(
  vehicleId: string | undefined,
): VehicleSpriteAsset | undefined {
  if (!vehicleId) return undefined;
  return VEHICLE_SPRITE_MANIFEST[vehicleId];
}
