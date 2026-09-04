"use client";

import { useGameStore } from "@/state/store";
import ResourceRow from "./ResourceRow";
import { useResourceRates } from "./useResourceRates";
import { visibleRates } from "./selectRelevant";

/**
 * Desktop-only left rail: every visible resource with its amount, rate, and
 * cap, always on screen. Hidden on mobile by `.resource-rail` in globals.css
 * where <MobileResourceStrip> takes over.
 */
export default function ResourceRail() {
  const rates = useResourceRates();
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);
  const autoRaceUnlocked = useGameStore((s) => s.autoRaceUnlocked);
  const rows = visibleRates(rates);

  return (
    <aside className="resource-rail" aria-label="Resources" data-testid="resource-rail">
      <div className="resource-rail__head">
        <div className="ui-kicker">Resources</div>
      </div>
      <div className="resource-rail__list">
        {rows.map((rate) => (
          <ResourceRow key={rate.id} rate={rate} />
        ))}
      </div>
      {(autoScavengeUnlocked || autoRaceUnlocked) && (
        <div className="resource-rail__foot">
          {autoScavengeUnlocked && (
            <span className="rail-auto">
              <span className="rail-auto__dot" aria-hidden="true" />
              Auto-scavenge
            </span>
          )}
          {autoRaceUnlocked && (
            <span className="rail-auto">
              <span className="rail-auto__dot" aria-hidden="true" />
              Auto-race
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
