import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXED_ASSET_MANIFEST } from "../manifest";

function pngMetadata(path: string): { width: number; height: number; hasAlpha: boolean } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(1, 4).toString("ascii"), path).toBe("PNG");
  const colorType = bytes[25];
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hasAlpha: colorType === 4 || colorType === 6,
  };
}

describe("fixed asset manifest", () => {
  it("has one unique, complete entry for every fixed gameplay definition", () => {
    const keys = FIXED_ASSET_MANIFEST.map((asset) => `${asset.kind}:${asset.id}`);
    expect(new Set(keys).size).toBe(keys.length);

    for (const asset of FIXED_ASSET_MANIFEST) {
      expect(asset.alt.trim().length, `${asset.kind}:${asset.id} alt`).toBeGreaterThan(0);
      expect(asset.displaySizes.length, `${asset.kind}:${asset.id} sizes`).toBeGreaterThan(0);
      expect(asset.anchor.x).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("ships correctly sized alpha PNG artwork for every manifest entry", () => {
    for (const asset of FIXED_ASSET_MANIFEST) {
      const path = join(process.cwd(), "public", ...asset.src.split("/").filter(Boolean));
      expect(existsSync(path), path).toBe(true);
      const png = pngMetadata(path);
      expect(png.width, path).toBe(asset.source.width);
      expect(png.height, path).toBe(asset.source.height);
      expect(png.hasAlpha, path).toBe(true);
    }
  });
});
