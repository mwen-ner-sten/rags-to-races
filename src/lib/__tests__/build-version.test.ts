import { describe, it, expect } from "vitest";
import { formatDate, formatVersion, bumpCounter } from "../build-version";

describe("formatDate", () => {
  it("formats a date as YYYY.MM.DD with zero-padded month and day", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026.01.05");
    expect(formatDate(new Date(2026, 11, 25))).toBe("2026.12.25");
  });
});

describe("formatVersion", () => {
  it("returns YYYY.MM.DD.BUILD", () => {
    expect(formatVersion(new Date(2026, 3, 4), 2)).toBe("2026.04.04.2");
  });

  it("works with build number 1", () => {
    expect(formatVersion(new Date(2026, 3, 4), 1)).toBe("2026.04.04.1");
  });
});

describe("bumpCounter", () => {
  it("increments build when date matches", () => {
    const prev = { date: "2026.04.04", build: 2 };
    const now = new Date(2026, 3, 4); // April 4
    expect(bumpCounter(prev, now)).toEqual({ date: "2026.04.04", build: 3 });
  });

  it("resets build to 1 when date changes", () => {
    const prev = { date: "2026.04.04", build: 5 };
    const now = new Date(2026, 3, 5); // April 5
    expect(bumpCounter(prev, now)).toEqual({ date: "2026.04.05", build: 1 });
  });

  it("resets build to 1 on month change", () => {
    const prev = { date: "2026.03.31", build: 10 };
    const now = new Date(2026, 3, 1); // April 1
    expect(bumpCounter(prev, now)).toEqual({ date: "2026.04.01", build: 1 });
  });

  it("increments correctly from build 1", () => {
    const prev = { date: "2026.04.04", build: 1 };
    const now = new Date(2026, 3, 4);
    expect(bumpCounter(prev, now)).toEqual({ date: "2026.04.04", build: 2 });
  });
});
