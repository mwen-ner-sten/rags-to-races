import { describe, expect, it } from "vitest";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { VEHICLE_SPRITE_MANIFEST, getVehicleSpriteAsset } from "../vehicleSpriteManifest";

describe("vehicle sprite manifest", () => {
  it("has bitmap sprite metadata for every vehicle definition", () => {
    for (const vehicle of VEHICLE_DEFINITIONS) {
      const sprite = getVehicleSpriteAsset(vehicle.id);

      expect(sprite, vehicle.id).toBeDefined();
      expect(sprite?.src).toBe(`/sprites/vehicles/${vehicle.id}.png`);
      expect(sprite?.width).toBe(64);
      expect(sprite?.height).toBe(64);
      expect(sprite?.anchor).toEqual({ x: 32, y: 32 });
    }
  });

  it("does not contain manifest entries for unknown vehicles", () => {
    expect(getVehicleSpriteAsset("missing_vehicle")).toBeUndefined();
  });

  it("keeps manifest order aligned to progression tiers", () => {
    const manifestIds = Object.keys(VEHICLE_SPRITE_MANIFEST);
    const definitionIds = VEHICLE_DEFINITIONS.map((vehicle) => vehicle.id);

    expect(manifestIds).toEqual(definitionIds);
  });
});
