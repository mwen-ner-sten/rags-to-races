"use client";

import { counterBlocker } from "@/core/actions";
import { countyPlaceBlocker } from "@/core/counties";
import { getPart } from "@/core/content/parts";
import { PLACES } from "@/core/content/places";
import { counterPrice, reservedPartUids, vehicleBusy } from "@/core/garage";
import type { HeritageProject } from "@/core/heritage";
import { jobBlocker } from "@/core/jobs";
import type { GameState, Vehicle } from "@/core/types";
import { conditionName } from "../format";
import { useGame } from "../store";

export function RestorationParts({ game, project, car }: { game: GameState; project: HeritageProject; car?: Vehicle }) {
  const dispatch = useGame((store) => store.dispatch);
  const reserved = reservedPartUids(game);
  return (
    <details>
      <summary>Find original components · {project.parts.length} slots</summary>
      <ul className="plain">
        {project.parts.map(({ slot, partId }) => {
          const part = getPart(partId);
          const fitted = car?.parts[slot];
          const match = fitted?.partId === partId ? fitted : undefined;
          const available = game.run.inventory
            .filter((p) => p.partId === partId && !reserved.has(p.uid))
            .sort((a, b) => b.condition - a.condition)[0];
          const sources = PLACES.filter((p) => p.finds.some((find) => find.partId === partId));
          const local = sources.filter((p) => !countyPlaceBlocker(game, p.id));
          const open = local.find(
            (p) => game.run.placesOpen.includes(p.id) && !jobBlocker(game, { kind: "haul", placeId: p.id }),
          );
          return (
            <li key={slot}>
              <strong>{part.name}</strong> · {slot}
              {match ? (
                <p>Installed · {conditionName(match.condition)}</p>
              ) : (
                <>
                  {available && (
                    <p>
                      In the garage · {conditionName(available.condition)}{" "}
                      {car && (
                        <button
                          className="btn small"
                          disabled={vehicleBusy(game, car.uid)}
                          onClick={() =>
                            dispatch({ type: "install", vehicleUid: car.uid, slot, partUid: available.uid })
                          }
                        >
                          Fit {part.name}
                        </button>
                      )}
                    </p>
                  )}
                  {!available && (
                    <p>
                      {game.run.driveway.some((p) => p.partId === partId)
                        ? "One is waiting on the driveway."
                        : local.length
                          ? "Salvage sources · " + local.map((p) => p.name).join(", ")
                          : sources.length
                            ? "Sourced out of county at " + sources.map((p) => p.name).join(", ")
                            : "Check the auction or a retired build."}
                    </p>
                  )}
                  {!available && open && (
                    <button
                      className="btn small"
                      onClick={() =>
                        dispatch({
                          type: "enqueue",
                          spec: {
                            kind: "haul",
                            placeId: open.id,
                            ...(game.run.learned.includes("tech:scouting") && { focus: part.category }),
                          },
                        })
                      }
                    >
                      Haul at {open.name}
                    </button>
                  )}
                  {!available && !counterBlocker(game, partId) && (
                    <button className="btn small" onClick={() => dispatch({ type: "buyPart", partId })}>
                      Order {part.name} · {counterPrice(game, partId)} Scrap Bucks
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
