import { afterEach, describe, expect, it } from "vitest";
import {
  SeededRandomSource,
  random,
  resetRandomSource,
  setRandomSource,
  withRandomSource,
} from "../random";

afterEach(() => resetRandomSource());

describe("RandomSource", () => {
  it("replays the same sequence for the same seed", () => {
    const first = new SeededRandomSource("campaign-42");
    const second = new SeededRandomSource("campaign-42");

    expect(Array.from({ length: 20 }, () => random(first))).toEqual(
      Array.from({ length: 20 }, () => random(second)),
    );
  });

  it("injects randomness into existing gameplay helpers", () => {
    setRandomSource({ next: () => 0.25 });
    expect(random()).toBe(0.25);
  });

  it("restores the prior source after a seeded scope", () => {
    setRandomSource({ next: () => 0.75 });
    expect(withRandomSource({ next: () => 0.1 }, () => random())).toBe(0.1);
    expect(random()).toBe(0.75);
  });

  it("rejects invalid source output", () => {
    expect(() => random({ next: () => 1 })).toThrow("must return");
    expect(() => random({ next: () => Number.NaN })).toThrow("must return");
  });
});
