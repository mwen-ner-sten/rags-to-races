import { describe, expect, it } from "vitest";
import { getLocationById } from "@/data/locations";
import { getPartById } from "@/data/parts";
import { scavenge } from "../scavenge";
import { withRandomSource, type RandomSource } from "@/utils/random";

class ScriptedRandomSource implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[]) {}

  next(): number {
    const value = this.values[this.index] ?? 0.99;
    this.index += 1;
    return value;
  }
}

describe("Scouting Orders", () => {
  it("applies a bounded three-times category weight without guaranteeing the ordered category", () => {
    const location = getLocationById("curbside")!;
    const roll = () => new ScriptedRandomSource([0, 0.5, 0, 0, 0.99]);

    const openSearch = withRandomSource(roll(), () => scavenge(location));
    const engineOrder = withRandomSource(roll(), () => scavenge(location, 0, 0, 0, 0, 0, "engine"));
    const veryHighRoll = withRandomSource(
      new ScriptedRandomSource([0, 0.99, 0, 0, 0.99]),
      () => scavenge(location, 0, 0, 0, 0, 0, "engine"),
    );

    expect(getPartById(openSearch[0].definitionId)?.category).toBe("wheel");
    expect(getPartById(engineOrder[0].definitionId)?.category).toBe("engine");
    expect(getPartById(veryHighRoll[0].definitionId)?.category).not.toBe("engine");
  });
});
