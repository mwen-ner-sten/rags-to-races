"use client";

import { getPart } from "@/core/content/parts";
import type { installedService } from "@/core/actions";
import { fittingParts, partSwapGain } from "@/core/buildPlanning";
import { partOriginLabel } from "@/core/provenance";
import type { SlotDef } from "@/core/content/vehicles";
import { partScoreAt } from "@/core/race";
import type { DisciplineId, PartInstance, Vehicle } from "@/core/types";
import { conditionName } from "../format";

export function partOption(part: PartInstance): string {
  return `${getPart(part.partId).name} (${conditionName(part.condition)})`;
}

interface BuildSlotRowProps {
  vehicle: Vehicle;
  slot: SlotDef;
  discipline: DisciplineId;
  venueId: string | undefined;
  /** Parts in the garage that no job has claimed. */
  free: readonly PartInstance[];
  busy: boolean;
  service?: ReturnType<typeof installedService>;
  onInstall: (partUid: string) => void;
  onPull: () => void;
  onService: () => void;
}

/** One slot of an owned vehicle: what is in it, what it's worth at the chosen venue, and a better option if the garage has one. */
export function BuildSlotRow({ vehicle, slot, discipline, venueId, free, busy, service, onInstall, onPull, onService }: BuildSlotRowProps) {
  const installed = vehicle.parts[slot.slot];
  const worth = (part: PartInstance) => partScoreAt(part, discipline, venueId, slot.slot);
  const gainFor = (part: PartInstance) => partSwapGain(vehicle, slot.slot, part, discipline, venueId);
  const signed = (gain: number) => `${gain >= 0 ? "+" : ""}${gain.toFixed(1)}`;
  const current = installed ? worth(installed) : 0;
  const options = fittingParts(free, slot);
  const best = options.reduce<PartInstance | null>((top, p) => (top === null || gainFor(p) > gainFor(top) ? p : top), null);
  const gain = best ? gainFor(best) : 0;
  const better = installed && best && gain >= 0.05 ? best : null;
  return (
    <div className="slot build-slot">
      <span className="slot-name">{slot.slot}</span>
      <span className="slot-part">
        {installed ? (
          <>
            {getPart(installed.partId).name} <span className={`cond c${installed.condition}`}>{conditionName(installed.condition)}</span>{" "}
            <span className="num muted build-worth">{current.toFixed(1)}</span>{installed.provenance && <span className="muted"> · {partOriginLabel(installed)}</span>}
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
                    {partOption(p)} · {signed(gainFor(p))} score · {partOriginLabel(p)}
                </option>
              ))}
            </select>
          )}
          {installed && (
            <button className="link-btn" onClick={onPull}>
              Pull
            </button>
          )}
          {service && typeof service !== "string" && <button className="btn small" onClick={onService}>Pull and {service.kind}</button>}
          {typeof service === "string" && <span className="why">{service}</span>}
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
