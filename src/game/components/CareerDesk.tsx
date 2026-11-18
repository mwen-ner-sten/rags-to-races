"use client";

import { useEffect } from "react";
import { PIN_NAMES, possiblePins } from "@/core/careerPin";
import { ProjectPin } from "./ProjectPin";
import { careerOpportunities, type CareerDestination } from "@/core/careerAdvice";
import type { GameState } from "@/core/types";

export interface CareerJump {
  target: CareerDestination;
  request: number;
}

function focusId(target: CareerDestination): string {
  switch (target.tab) {
    case "legacy": return target.objective ? `reset-objective-${target.objective}` : "legacy-h";
    case "trips": return "trips-h";
    case "garage": return target.section === "service" ? "service-counter" : "build-h";
    case "manufacturer": return "manufacturer-h";
    case "notebook": return "nb-panel";
    case "team": return "section" in target ? "crew-h" : target.focus ? `team-${target.focus}` : `reset-discipline-${target.discipline}`;
    case "race": return `race-venue-${target.venueId}`;
    case "owner": return target.section === "round" ? "owner-round" : "owner-charters";
    case "promoter": return "promoter-heading";
  }
}

export function CareerFocus({ jump }: { jump: CareerJump | null }) {
  useEffect(() => {
    if (!jump) return;
    const destination = document.getElementById(focusId(jump.target));
    if (!destination) return;
    const group = destination.closest("details");
    if (group) group.open = true;
    if (destination.tabIndex < 0) destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
    destination.scrollIntoView({ block: "start" });
  }, [jump]);
  return null;
}

export function CareerDesk({ game, active, onOpen }: { game: GameState; active: string; onOpen: (target: CareerDestination) => void }) {
  if (!["trips", "legacy", "team", "owner"].includes(active)) return null;
  const opportunities = careerOpportunities(game);
  if (!opportunities.length && !game.meta.careerPin && !possiblePins(game).length) return null;
  return (
    <details className="section" open={active !== "trips" || !!game.meta.careerPin}>
      <summary>Career opportunities{active === "trips" && (game.meta.careerPin ? " · " + PIN_NAMES[game.meta.careerPin] : opportunities[0] ? " · " + opportunities[0].title : "")}</summary>
      <ProjectPin game={game} onOpen={onOpen} />
      {opportunities.map((item) => (
        <section key={item.id} aria-labelledby={`career-${item.id}`}>
          <h3 id={`career-${item.id}`}>{item.title}</h3>
          <p className="sub">{item.detail}</p>
          {item.evidence && <p className="hint">{item.evidence}</p>}
          {item.actions.length > 0 && (
            <div className="actions">
              {item.actions.map((action) => <button type="button" className="btn small" key={action.label} onClick={() => onOpen(action.destination)}>{action.label}</button>)}
            </div>
          )}
        </section>
      ))}
    </details>
  );
}
