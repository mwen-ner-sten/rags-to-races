"use client";

import { getPart } from "@/core/content/parts";
import type { SlotDef } from "@/core/content/vehicles";
import { partScoreAt } from "@/core/race";
import type { DisciplineId, PartInstance, Vehicle } from "@/core/types";
import { conditionName } from "../format";

export function partOption(part: PartInstance): string {
  return `${getPart(part.partId).name} (${conditionName(part.condition)})`;
}

/** Free parts that could go in this slot right now. */
export function fittingParts(free: readonly PartInstance[], slot: SlotDef): PartInstance[] {
  return free.filter((p) => slot.accepts.includes(p.partId) && p.condition > 0 && (slot.minCondition === undefined || p.condition >= slot.minCondition));
}

interface BuildSlotRowProps {
  vehicle: Vehicle;
  slot: SlotDef;
  discipline: DisciplineId;
  venueId: string | undefined;
  /** Parts in the garage that no job has claimed. */
  free: readonly PartInstance[];
  busy: boolean;
  onInstall: (partUid: string) => void;
  onPull: () => void;
}

/** One slot of an owned vehicle: what is in it, what it's worth at the chosen venue, and a better option if the garage has one. */
export function BuildSlotRow({ vehicle, slot, discipline, venueId, free, busy, onInstall, onPull }: BuildSlotRowProps) {
  const installed = vehicle.parts[slot.slot];
  const worth = (part: PartInstance) => partScoreAt(part, discipline, venueId, slot.slot);
  const current = installed ? worth(installed) : 0;
  const options = fittingParts(free, slot);
  const best = options.reduce<PartInstance | null>((top, p) => (top === null || worth(p) > worth(top) ? p : top), null);
  const gain = best ? worth(best) - current : 0;
  const better = installed && best && gain >= 0.05 ? best : null;
  return (
    <div className="slot build-slot">
      <span className="slot-name">{slot.slot}</span>
      <span className="slot-part">
        {installed ? (
          <>
            {getPart(installed.partId).name} <span className={`cond c${installed.condition}`}>{conditionName(installed.condition)}</span>{" "}
            <span className="num muted build-worth">{current.toFixed(1)}</span>
          </>
        ) : (
          <span className="why">Empty{slot.required ? ". It can't race" : ""}</span>
        )}
      </span>
      {busy ? (
        <span className="why">Out racing. Changes wait until it&apos;s back.</span>
      ) : (
        <span className="slot-actions">
          {options.length > 0 && (
            <select aria-label={`Swap ${slot.slot}`} value="" onChange={(e) => e.target.value && onInstall(e.target.value)}>
              <option value="">Swap in…</option>
              {options.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {partOption(p)} · {worth(p).toFixed(1)}
                </option>
              ))}
            </select>
          )}
          {installed && (
            <button className="link-btn" onClick={onPull}>
              Pull
            </button>
          )}
        </span>
      )}
      {!busy && better && (
        <span className="build-better">
          <span>
            Better here: {partOption(better)}, <span className="num">+{gain.toFixed(1)}</span>
          </span>
          <button className="btn small wrap" onClick={() => onInstall(better.uid)}>
            Install it
          </button>
        </span>
      )}
    </div>
  );
}
