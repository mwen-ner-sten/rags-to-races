import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARTS } from "@/core/content/parts";
import { VEHICLES } from "@/core/content/vehicles";
import { PLACES } from "@/core/content/places";
import { VENUES } from "@/core/content/events";
import { TEAM_ORGANIZATION_IDS } from "@/core/content/team";
import courses from "../rally-course.json";
import spec from "../../../scripts/art/spec.json";
import {
  organizationSprite,
  partSprite,
  placeSprite,
  rallySprite,
  stageSprite,
  vehicleSprite,
  venueSprite,
} from "../sprites";

// The art standard lives in docs/art/art-bible.md. These tests keep the
// shipped files and the content in step: every id has art, every file is used,
// and every file has its category's size. Pixel checks (palette, darkness,
// edges) are in scripts/art/check_sprites.py.

const PUBLIC = join(process.cwd(), "public");
const SPRITES = join(PUBLIC, "sprites");
type Category = keyof typeof spec;

/** Width and height from a WebP header (VP8, VP8L or VP8X). */
function webpSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.toString("ascii", 0, 4) + b.toString("ascii", 8, 12), file).toBe("RIFFWEBP");
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

const expected: Record<string, string> = {};
const want = (url: string, owner: string) => (expected[url] = owner);
for (const p of PARTS) want(partSprite(p.id), `part ${p.id}`);
for (const v of VEHICLES) want(vehicleSprite(v.id), `vehicle ${v.id}`);
for (const v of VEHICLES) want(rallySprite(v.id), `rally marker for ${v.id}`);
for (const p of PLACES) want(placeSprite(p.id), `place ${p.id}`);
for (const v of VENUES) want(venueSprite(v.id), `venue ${v.id}`);
for (const o of TEAM_ORGANIZATION_IDS) want(organizationSprite(o), `organization ${o}`);
for (const layout of Object.keys(courses)) want(stageSprite(layout), `rally stage ${layout}`);

function shipped(): string[] {
  return readdirSync(SPRITES, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => "/" + join(e.parentPath, e.name).slice(PUBLIC.length + 1).replaceAll("\\", "/"));
}

describe("sprites", () => {
  it("every content id has its sprite", () => {
    const missing = Object.entries(expected)
      .filter(([url]) => !existsSync(join(PUBLIC, url)))
      .map(([url, owner]) => `${owner} -> ${url}`);
    expect(missing, "render it with scripts/art (docs/art/art-bible.md)").toEqual([]);
  });

  it("ships no unused or misplaced files", () => {
    const stray = shipped().filter((url) => !(url in expected));
    expect(stray, "delete it, or add the content that uses it").toEqual([]);
  });

  it("every sprite has its category's size", () => {
    const wrong = shipped().flatMap((url) => {
      const category = url.split("/")[2] as Category;
      const size = spec[category]?.size;
      const actual = webpSize(join(PUBLIC, url));
      return size && actual[0] === size[0] && actual[1] === size[1] ? [] : [`${url} is ${actual.join("x")}, want ${size?.join("x")}`];
    });
    expect(wrong).toEqual([]);
  });

  it("maps rally markers by vehicle kind", () => {
    expect(rallySprite("go_kart")).toBe("/sprites/rally/kart.webp");
    expect(rallySprite("riding_mower")).toBe("/sprites/rally/mower.webp");
    expect(rallySprite("roadbook_special")).toBe("/sprites/rally/saloon.webp");
  });
});
