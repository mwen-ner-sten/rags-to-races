import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Track, type TrackProps } from "../Track";

const base: TrackProps = {
  venueId: "dirt",
  vehicleId: "go_kart",
  fieldSize: 6,
  laps: 3,
  progress: 0.5,
  playerRank: 2,
};

const render = (over: Partial<TrackProps> = {}) => renderToStaticMarkup(<Track {...base} {...over} />);

describe("Track", () => {
  it("renders an accessible, themed svg with the player sprite and every car", () => {
    const html = render({ label: "Dirt track, you are 2nd" });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Dirt track, you are 2nd"');
    expect(html).toContain('data-venue="dirt"');
    expect(html).toContain("/sprites/vehicles/go_kart.webp");
    expect(html.match(/tk-opp-/g)?.length).toBe(5);
  });

  it("falls back to the backyard theme for unknown venues", () => {
    expect(render({ venueId: "moon" })).toContain('data-venue="backyard"');
  });

  it("supports the strip and field sizes 2-10", () => {
    for (const fieldSize of [2, 6, 10]) {
      const html = render({ shape: "strip", fieldSize, laps: 1 });
      expect(html.match(/tk-opp-/g)?.length).toBe(fieldSize - 1);
    }
  });

  it("shows start lights early and the flag when finished, but never in compact mode", () => {
    expect(render({ progress: 0.02 })).toContain("tk-light-housing");
    expect(render({ progress: 0.5 })).not.toContain("tk-light-housing");
    expect(render({ progress: 1, finished: true })).toContain("tk-flag-pole");
    const compact = render({ progress: 0.02, finished: true, compact: true });
    expect(compact).not.toContain("tk-light-housing");
    expect(compact).not.toContain("tk-flag-pole");
    expect(compact).not.toContain("tk-puffs");
  });

  it("trails dust only while running, and smokes once the player has stopped", () => {
    expect(render()).toContain("tk-puffs");
    expect(render({ progress: 0 })).not.toContain("tk-puffs");
    const stopped = render({ dnfAt: 0.3, progress: 0.6 });
    expect(stopped).toContain("tk-smokes");
    expect(stopped).not.toContain("tk-puffs");
  });

  it("only adds a CSS transition when asked to", () => {
    expect(render({ transitionMs: 500 })).toContain("transform 500ms linear");
    expect(render({ transitionMs: 0 })).not.toContain("500ms");
  });
});
