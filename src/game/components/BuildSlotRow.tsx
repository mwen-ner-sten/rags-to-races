"use client";

import type { ReactNode } from "react";
import { getPart } from "@/core/content/parts";
import type { installedService } from "@/core/actions";
import { fittingParts, partSwapGain } from "@/core/buildPlanning";
import { batonPartTag } from "@/core/countyBaton";
import { partOriginLabel } from "@/core/provenance";
import type { SlotDef } from "@/core/content/vehicles";
import { partScoreAt } from "@/core/race";
import type { DisciplineId, GameState, PartInstance, Vehicle } from "@/core/types";
import { conditionName } from "../format";
import { BatonGuardControls } from "./CountyBaton";
import type { ChoiceItem } from "./ChoiceList";

export function partOption(part: PartInstance, batonTag?: string): string {
  return `${getPart(part.partId).name} (${conditionName(part.condition)})${batonTag ? ` · ${batonTag}` : ""}`;
}

/** A part's name with its condition chip, for rows that show parts inline. */
export function PartTitle({ part }: { part: PartInstance }) {
  return (
    <>
      {getPart(part.partId).name} <span className={`cond c${part.condition}`}>{conditionName(part.condition)}</span>
    </>
  );
}

/** A part as a ChoiceList row: name and condition up front, origin underneath unless `meta` says otherwise. */
export function partChoice(part: PartInstance, meta: ReactNode = partOriginLabel(part)): ChoiceItem {
  return { id: part.uid, title: <PartTitle part={part} />, meta };
}

interface SwapListProps {
  game: GameState;
  label: string;
  options: readonly PartInstance[];
  gainFor: (part: PartInstance) => number;
  onInstall: (partUid: string) => void;
}

const signedGain = (gain: number) => `${gain >= 0 ? "+" : ""}${gain.toFixed(1)}`;

/** Every fitting part with its own Install button, best gain first. */
function SwapList({ game, label, options, gainFor, onInstall }: SwapListProps) {
  const rows = options.map((part) => ({ part, gain: gainFor(part) })).sort((a, b) => b.gain - a.gain);
  return (
    <details className="swap-list">
      <summary>Swap in… ({rows.length})<span className="sr-only"> for {label}</span></summary>
      <ul className="choice-rows">
        {rows.map(({ part, gain }) => {
          const tag = batonPartTag(game, part);
          return (
            <li key={part.uid} className="choice-row">
              <span className="choice-text">
                <span className="choice-title">
                  <PartTitle part={part} />
                  {tag && <span className="choice-tag">{tag}</span>}
                </span>
                <span className="choice-meta">
                  <span className="num">{signedGain(gain)}</span> score · {partOriginLabel(part)}
                </span>
              </span>
              <button type="button" className="btn small" aria-label={`Install ${getPart(part.partId).name}`} onClick={() => onInstall(part.uid)}>
                Install
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

interface BuildSlotRowProps {
  game: GameState;
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
export function BuildSlotRow({ game, vehicle, slot, discipline, venueId, free, busy, service, onInstall, onPull, onService }: BuildSlotRowProps) {
  const installed = vehicle.parts[slot.slot];
  const batonTag = installed && batonPartTag(game, installed);
  const worth = (part: PartInstance) => partScoreAt(part, discipline, venueId, slot.slot);
  const gainFor = (part: PartInstance) => partSwapGain(vehicle, slot.slot, part, discipline, venueId);
  const current = installed ? worth(installed) : 0;
  const options = fittingParts(free, slot);
  const best = options.reduce<PartInstance | null>((top, p) => (top === null || gainFor(p) > gainFor(top) ? p : top), null);
  const gain = best ? gainFor(best) : 0;
  const better = installed && best && gain >= 0.05 ? best : null;
  return (
    <div className="slot build-slot">
      <span className="slot-name">{slot.label ?? slot.slot}</span>
      <span className="slot-part">
        {installed ? (
          <>
            {getPart(installed.partId).name} <span className={`cond c${installed.condition}`}>{conditionName(installed.condition)}</span>{" "}
            <span className="num muted build-worth">{current.toFixed(1)}</span>{installed.provenance && <span className="muted"> · {partOriginLabel(installed)}</span>}
            {batonTag && <span className="chip">{batonTag}</span>}
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
            <SwapList game={game} label={slot.label ?? slot.slot} options={options} gainFor={gainFor} onInstall={onInstall} />
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
      {installed && batonTag && <BatonGuardControls game={game} part={installed} />}
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
