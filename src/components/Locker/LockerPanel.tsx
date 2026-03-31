"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import {
  GEAR_SLOTS,
  GEAR_SLOT_LABELS,
  GEAR_DEFINITIONS,
  getGearById,
  getGearForSlot,
  type GearSlot,
  type GearDefinition,
} from "@/data/gear";
import { getGearBonuses } from "@/engine/gear";
import { formatNumber } from "@/utils/format";

const TIER_COLORS = [
  "text-zinc-500",   // T0
  "text-zinc-300",   // T1
  "text-green-400",  // T2
  "text-blue-400",   // T3
  "text-purple-400", // T4
];

const TIER_BORDER = [
  "border-zinc-800",
  "border-zinc-600",
  "border-green-800/50",
  "border-blue-800/50",
  "border-purple-800/50",
];

function effectLabel(type: string, value: number): string {
  const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
  switch (type) {
    case "scavenge_luck_bonus": return `${pct(value)} scavenge luck`;
    case "scavenge_yield_pct": return `${pct(value)} scavenge yield`;
    case "sell_value_bonus_pct": return `${pct(value)} sell value`;
    case "race_performance_pct": return `${pct(value)} race performance`;
    case "race_dnf_reduction": return `${pct(value)} DNF reduction`;
    case "race_handling_pct": return `${pct(value)} handling`;
    case "race_wear_reduction_pct": return `${pct(value)} wear reduction`;
    case "race_scrap_bonus_pct": return `${pct(value)} race scrap`;
    case "build_cost_reduction_pct": return `${pct(value)} build cost`;
    case "repair_cost_reduction_pct": return `${pct(value)} repair cost`;
    case "refurb_cost_reduction_pct": return `${pct(value)} refurb cost`;
    default: return `${pct(value)} ${type}`;
  }
}

export default function LockerPanel() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const equippedGear = useGameStore((s) => s.equippedGear);
  const ownedGearIds = useGameStore((s) => s.ownedGearIds);
  const purchaseGear = useGameStore((s) => s.purchaseGear);
  const equipGear = useGameStore((s) => s.equipGear);

  const [expandedSlot, setExpandedSlot] = useState<GearSlot | null>(null);

  const bonuses = getGearBonuses(equippedGear);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── Your Outfit ── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Your Outfit
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {GEAR_SLOTS.map((slot) => {
            const gearId = equippedGear[slot];
            const def = gearId ? getGearById(gearId) : null;
            const slotInfo = GEAR_SLOT_LABELS[slot];
            const isExpanded = expandedSlot === slot;

            return (
              <button
                key={slot}
                onClick={() => setExpandedSlot(isExpanded ? null : slot)}
                className={`rounded-lg border p-2.5 text-left transition-colors ${
                  isExpanded
                    ? "border-orange-600 bg-zinc-800"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{slotInfo.icon}</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {slotInfo.label}
                  </span>
                </div>
                {def && (
                  <div className="mt-1">
                    <span className={`text-sm font-semibold ${TIER_COLORS[def.tier] ?? "text-white"}`}>
                      {def.name}
                    </span>
                    {def.effects.length > 0 && (
                      <div className="mt-0.5">
                        {def.effects.map((e, i) => (
                          <span
                            key={i}
                            className={`text-xs ${e.value < 0 ? "text-red-400" : "text-green-400"}`}
                          >
                            {effectLabel(e.type, e.value)}
                            {i < def.effects.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {def.effects.length === 0 && def.tier === 0 && (
                      <p className="mt-0.5 text-xs text-zinc-600">No bonuses</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Gear Shop (expanded slot) ── */}
      {expandedSlot && (
        <SlotShop
          slot={expandedSlot}
          scrapBucks={scrapBucks}
          repPoints={repPoints}
          equippedGearId={equippedGear[expandedSlot]}
          ownedGearIds={ownedGearIds}
          purchaseGear={purchaseGear}
          equipGear={equipGear}
        />
      )}

      {/* ── Active Bonuses Summary ── */}
      <BonusSummary bonuses={bonuses} />
    </div>
  );
}

function SlotShop({
  slot,
  scrapBucks,
  repPoints,
  equippedGearId,
  ownedGearIds,
  purchaseGear,
  equipGear,
}: {
  slot: GearSlot;
  scrapBucks: number;
  repPoints: number;
  equippedGearId: string;
  ownedGearIds: string[];
  purchaseGear: (id: string) => void;
  equipGear: (id: string) => void;
}) {
  const items = getGearForSlot(slot);
  const slotInfo = GEAR_SLOT_LABELS[slot];

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        <span>{slotInfo.icon}</span>
        {slotInfo.label} Gear
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((gear) => {
          const owned = ownedGearIds.includes(gear.id);
          const equipped = equippedGearId === gear.id;
          const canAfford = scrapBucks >= gear.cost;
          const meetsRep = !gear.unlockRequirement?.repPoints || repPoints >= gear.unlockRequirement.repPoints;
          const locked = !meetsRep;

          return (
            <div
              key={gear.id}
              className={`rounded-md border p-2.5 sm:p-3 ${
                equipped
                  ? "border-orange-600/50 bg-orange-900/10"
                  : locked
                    ? "border-zinc-800 bg-zinc-900/50 opacity-50"
                    : owned
                      ? "border-green-800/50 bg-green-900/10"
                      : TIER_BORDER[gear.tier] + " bg-zinc-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${TIER_COLORS[gear.tier] ?? "text-white"}`}>
                      {gear.name}
                    </span>
                    <span className="text-xs text-zinc-600">T{gear.tier}</span>
                    {equipped && (
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-semibold text-orange-400">
                        EQUIPPED
                      </span>
                    )}
                    {owned && !equipped && (
                      <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs font-semibold text-green-400">
                        OWNED
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{gear.description}</p>
                  {gear.effects.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                      {gear.effects.map((e, i) => (
                        <span
                          key={i}
                          className={`text-xs font-mono ${e.value < 0 ? "text-red-400" : "text-emerald-400"}`}
                        >
                          {effectLabel(e.type, e.value)}
                        </span>
                      ))}
                    </div>
                  )}
                  {gear.effects.length === 0 && gear.tier > 0 && (
                    <p className="mt-1 text-xs text-zinc-500 italic">Removes starting penalty</p>
                  )}
                  {locked && gear.unlockRequirement?.repPoints && (
                    <p className="mt-1 text-xs text-zinc-600">
                      Requires {gear.unlockRequirement.repPoints} Rep
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-600 italic">&quot;{gear.flavorText}&quot;</p>
                </div>
                <div className="shrink-0">
                  {!owned && !locked && (
                    <button
                      onClick={() => purchaseGear(gear.id)}
                      disabled={!canAfford}
                      className="rounded border border-orange-600 px-2.5 py-1 text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {gear.cost === 0 ? "FREE" : `$${formatNumber(gear.cost)}`}
                    </button>
                  )}
                  {owned && !equipped && (
                    <button
                      onClick={() => equipGear(gear.id)}
                      className="rounded border border-green-600 px-2.5 py-1 text-xs font-semibold text-green-400 transition-colors hover:bg-green-600/20"
                    >
                      Equip
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BonusSummary({ bonuses }: { bonuses: ReturnType<typeof getGearBonuses> }) {
  const entries = Object.entries(bonuses).filter(([, v]) => v !== 0);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Active Gear Bonuses
        </h3>
        <p className="mt-1 text-xs text-zinc-600">No gear bonuses active. Equip better gear to get bonuses.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        Active Gear Bonuses
      </h3>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([type, value]) => (
          <span
            key={type}
            className={`text-xs font-mono ${value < 0 ? "text-red-400" : "text-emerald-400"}`}
          >
            {effectLabel(type, value)}
          </span>
        ))}
      </div>
    </div>
  );
}
