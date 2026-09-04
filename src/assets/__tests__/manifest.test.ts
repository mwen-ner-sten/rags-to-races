import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXED_ASSET_MANIFEST } from "../manifest";

const SPRITES_ROOT = join(process.cwd(), "public", "sprites");

/** Parse the pixel size out of a WebP container (VP8X, VP8L, or plain VP8 bitstreams). */
function webpMetadata(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 4).toString("ascii"), path).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("ascii"), path).toBe("WEBP");
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  expect(chunk, path).toBe("VP8 ");
  return {
    width: bytes.readUInt16LE(26) & 0x3fff,
    height: bytes.readUInt16LE(28) & 0x3fff,
  };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function publicPath(src: string): string {
  return join(process.cwd(), "public", ...src.split("/").filter(Boolean));
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

  it("points every manifest entry at a WebP file that exists under public/", () => {
    for (const asset of FIXED_ASSET_MANIFEST) {
      expect(asset.src, `${asset.kind}:${asset.id}`).toMatch(/^\/sprites\/.+\.webp$/);
      expect(existsSync(publicPath(asset.src)), asset.src).toBe(true);
    }
  });

  it("ships correctly sized WebP artwork for every manifest entry", () => {
    for (const asset of FIXED_ASSET_MANIFEST) {
      const path = publicPath(asset.src);
      const webp = webpMetadata(path);
      expect(webp.width, path).toBe(asset.source.width);
      expect(webp.height, path).toBe(asset.source.height);
    }
  });

  it("keeps authoring PNGs and review sheets out of the shipped sprite tree", () => {
    const shipped = walk(SPRITES_ROOT).map((file) => file.slice(SPRITES_ROOT.length + 1).replace(/\\/g, "/"));
    expect(shipped.length).toBeGreaterThan(0);
    expect(shipped.filter((file) => !file.endsWith(".webp"))).toEqual([]);
    expect(shipped.filter((file) => /(^|\/)(review|source)\//.test(file) || file.includes("contact-sheet"))).toEqual([]);
  });
});
