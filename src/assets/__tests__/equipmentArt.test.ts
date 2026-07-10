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
      silhouette: "/sprites/stations/diagnostics.png",
      rarityFrame: "/sprites/equipment/rarity/legendary.png",
      setMotif: "/sprites/equipment/sets/redline.png",
      affixOverlays: [
        "/sprites/equipment/affixes/engineering.png",
        "/sprites/equipment/affixes/speed.png",
      ],
    });
  });

  it("ships every layer referenced by the composition catalog", () => {
    for (const slot of GARAGE_STATION_IDS) {
      expect(publicAssetExists(`/sprites/stations/${slot}.png`), slot).toBe(true);
    }
    for (const rarity of ["common", "uncommon", "rare", "epic", "legendary"]) {
      expect(publicAssetExists(`/sprites/equipment/rarity/${rarity}.png`), rarity).toBe(true);
    }
    for (const set of STATION_SET_IDS) {
      expect(publicAssetExists(`/sprites/equipment/sets/${set}.png`), set).toBe(true);
    }
    for (const affix of EQUIPMENT_AFFIX_ART_IDS) {
      expect(publicAssetExists(`/sprites/equipment/affixes/${affix}.png`), affix).toBe(true);
    }
  });
});
