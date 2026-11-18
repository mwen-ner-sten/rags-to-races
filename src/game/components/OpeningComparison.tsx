"use client";
import { useState } from "react";
import { apply } from "@/core/actions";
import { channel } from "@/core/channels";
import { DISCIPLINES } from "@/core/content/events";
import { getKnowhow } from "@/core/content/knowhow";
import { DARE_BY_ID, isSeasonChallenge, PERK_BY_ID, SEASON_CHALLENGES } from "@/core/content/modifiers";
import { getPart } from "@/core/content/parts";
import { getPlace } from "@/core/content/places";
import { TEAM_ORGANIZATIONS } from "@/core/content/team";
import { HOME_COUNTIES, homeCounty } from "@/core/counties";
import { garageSpace } from "@/core/garage";
import { carryFor } from "@/core/haul";
import { baseDuration } from "@/core/jobs";
import type { ScrapChoices, TeamChoices } from "@/core/layers";
import type { GameState } from "@/core/types";
import { conditionName, duration } from "../format";

function opening(game: GameState) {
  const { run, config, era } = game;
  const goal = config.dare;
  return {
    Garage: era ? era.teamName + " · " + TEAM_ORGANIZATIONS[era.organization ?? "independent"].name : "Home garage",
    Location: HOME_COUNTIES[homeCounty(game)].name,
    Discipline: DISCIPLINES[era?.discipline ?? "dirt"].name,
    "Season objective": goal
      ? (isSeasonChallenge(goal) ? SEASON_CHALLENGES[goal] : DARE_BY_ID[goal]).name
      : "Open Season",
    "Equipped perks": config.perks.map((p) => PERK_BY_ID[p].name).join(", ") || "None",
    "Opening stock":
      [
        ...run.vehicles.map((v) => v.name),
        ...run.inventory.map((p) => conditionName(p.condition) + " " + getPart(p.partId).name),
      ].join(", ") || "Empty garage",
    "Open trips": run.placesOpen.map((id) => getPlace(id).name).join(", "),
    "Curbside trip": duration(baseDuration(game, { kind: "haul", placeId: "curb" })) + " · carry " + carryFor(game),
    "Garage space": garageSpace(game) + " parts · " + channel(game, "benches") + " benches",
    "Starting know-how": run.learned.map((id) => getKnowhow(id).name).join(", ") || "None",
    Bank: game.scrap.lp + " Legacy Points · " + game.team.tp + " Team Points",
    Crew: (era?.crew.length ?? 0) + " retained",
  };
}
type Snapshot = ReturnType<typeof opening>;

export function OpeningComparison({
  game,
  layer,
  choices,
  blocker,
}: {
  game: GameState;
  layer: "scrap" | "team";
  choices: ScrapChoices | TeamChoices;
  blocker: string | null;
}) {
  const [sketches, setSketches] = useState<[Snapshot | null, Snapshot | null]>([null, null]);
  const [error, setError] = useState("");
  const record = (slot: 0 | 1) => {
    const result = apply(game, { type: "reset", layer, choices });
    if (result.error) {
      setError(result.error);
      return;
    }
    const details = opening(result.state);
    setSketches((prev) => (slot === 0 ? [details, prev[1]] : [prev[0], details]));
    setError("");
  };
  const first = sketches[0] ?? sketches[1];
  return (
    <details className="opening-comparison">
      <summary>Compare opening garages</summary>
      <p>
        Save the current setup in A or B, change your choices, then save the other opening. Your current Season keeps
        running.
      </p>
      <div className="actions">
        {(["A", "B"] as const).map((label, i) => (
          <button key={label} className="btn small" disabled={!!blocker} onClick={() => record(i === 0 ? 0 : 1)}>
            Preview in {label}
          </button>
        ))}
      </div>
      {(blocker || error) && <p className="why">{blocker ?? error}</p>}
      {first && (
        <table className="opening-table">
          <thead>
            <tr>
              <th scope="col">At the start</th>
              {sketches.map(
                (view, i) =>
                  view && (
                    <th key={i} scope="col">
                      Opening {i === 0 ? "A" : "B"}
                    </th>
                  ),
              )}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(first) as (keyof Snapshot)[]).map((key) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                {sketches.map((view, i) => view && <td key={i}>{view[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
