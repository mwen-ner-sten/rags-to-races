import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARTS } from "@/core/content/parts";
import { VEHICLES } from "@/core/content/vehicles";
import { partSprite, vehicleSprite } from "../sprites";

const publicFile = (url: string): string => join(process.cwd(), "public", url);

describe("sprites", () => {
  it("every part id resolves to an image that exists", () => {
    for (const part of PARTS) expect(existsSync(publicFile(partSprite(part.id))), `${part.id} -> ${partSprite(part.id)}`).toBe(true);
  });

  it("every vehicle id resolves to an image that exists", () => {
    for (const vehicle of VEHICLES) expect(existsSync(publicFile(vehicleSprite(vehicle.id))), `${vehicle.id} -> ${vehicleSprite(vehicle.id)}`).toBe(true);
  });
});
