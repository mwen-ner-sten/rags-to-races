import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_AFFIX_ART_IDS, STATION_SET_IDS, composeEquipmentArt } from "../equipmentArt";
import { GARAGE_STATION_IDS } from "@/data/garageStations";

function publicAssetExists(src: string): boolean {
  return existsSync(join(process.cwd(), "public", ...src.split("/").filter(Boolean)));
}

describe("procedural station equipment art", () => {
  it("composes slot, set, rarity, and modifier layers", () => {
    const art = composeEquipmentArt({
      slot: "diagnostics",
      rarity: "legendary",
      set: "redline",
      affixes: ["engineering", "speed"],
    });
    expect(art).toEqual({
      silhouette: "/sprites/stations/diagnostics.webp",
      rarityFrame: "/sprites/equipment/rarity/legendary.webp",
      setMotif: "/sprites/equipment/sets/redline.webp",
      affixOverlays: [
        "/sprites/equipment/affixes/engineering.webp",
        "/sprites/equipment/affixes/speed.webp",
      ],
    });
  });

  it("ships every layer referenced by the composition catalog", () => {
    for (const slot of GARAGE_STATION_IDS) {
      expect(publicAssetExists(`/sprites/stations/${slot}.webp`), slot).toBe(true);
    }
    for (const rarity of ["common", "uncommon", "rare", "epic", "legendary"]) {
      expect(publicAssetExists(`/sprites/equipment/rarity/${rarity}.webp`), rarity).toBe(true);
    }
    for (const set of STATION_SET_IDS) {
      expect(publicAssetExists(`/sprites/equipment/sets/${set}.webp`), set).toBe(true);
    }
    for (const affix of EQUIPMENT_AFFIX_ART_IDS) {
      expect(publicAssetExists(`/sprites/equipment/affixes/${affix}.webp`), affix).toBe(true);
    }
  });
});
