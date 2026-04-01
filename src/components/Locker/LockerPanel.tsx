"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import {
  GEAR_SLOTS,
  GEAR_SLOT_LABELS,
  getGearById,
  getGearForSlot,
  type GearSlot,
} from "@/data/gear";
import { getGearBonuses } from "@/engine/gear";
import {
  RARITY_COLORS,
  RARITY_BORDER,
  RARITY_BG,
  RARITY_LABELS,
  type LootGearItem,
  type InstalledMod,
} from "@/data/lootGear";
import { getModTemplateById } from "@/data/gearMods";
import { TALENT_NODES, TALENT_TREES, getTalentNodesForTree } from "@/data/talentNodes";
import { getEnhancementCost, getMaxEnhancementLevel, getEnhancedEffects, getSalvageValue } from "@/engine/gearEnhance";
import { formatNumber } from "@/utils/format";

// ── Effect label helper ──────────────────────────────────────────────────────
function effectLabel(type: string, value: number): string {
  const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
  switch (type) {
    case "scavenge_luck_bonus":      return `${pct(value)} scavenge luck`;
    case "scavenge_yield_pct":       return `${pct(value)} scavenge yield`;
    case "sell_value_bonus_pct":     return `${pct(value)} sell value`;
    case "race_performance_pct":     return `${pct(value)} race performance`;
    case "race_dnf_reduction":       return `${pct(value)} DNF reduction`;
    case "race_handling_pct":        return `${pct(value)} handling`;
    case "race_wear_reduction_pct":  return `${pct(value)} wear reduction`;
    case "race_scrap_bonus_pct":     return `${pct(value)} race scrap`;
    case "build_cost_reduction_pct":  return `${pct(value)} build cost`;
    case "repair_cost_reduction_pct": return `${pct(value)} repair cost`;
    case "refurb_cost_reduction_pct": return `${pct(value)} refurb cost`;
    case "fatigue_rate_reduction":    return `${pct(value)} less fatigue/race`;
    case "material_bonus_pct":        return `${pct(value)} decompose yield`;
    case "forge_token_chance_bonus":  return `${pct(value)} forge token chance`;
    default: return `${pct(value)} ${type}`;
  }
}

const TIER_COLORS = [
  "text-zinc-500", "text-zinc-300", "text-green-400", "text-blue-400", "text-purple-400",
];
const TIER_BORDER = [
  "border-zinc-800", "border-zinc-600", "border-green-800/50", "border-blue-800/50", "border-purple-800/50",
];

type LockerTab = "outfit" | "loot" | "mods" | "talents";

// ── Main component ───────────────────────────────────────────────────────────
export default function LockerPanel() {
  const [activeTab, setActiveTab] = useState<LockerTab>("outfit");

  const scrapBucks        = useGameStore((s) => s.scrapBucks);
  const repPoints         = useGameStore((s) => s.repPoints);
  const equippedGear      = useGameStore((s) => s.equippedGear);
  const ownedGearIds      = useGameStore((s) => s.ownedGearIds);
  const equippedLootGear  = useGameStore((s) => s.equippedLootGear);
  const lootGearInventory = useGameStore((s) => s.lootGearInventory);
  const gearModInventory  = useGameStore((s) => s.gearModInventory);
  const unlockedTalentNodes = useGameStore((s) => s.unlockedTalentNodes);
  const workshopLevels    = useGameStore((s) => s.workshopLevels);

  const purchaseGear   = useGameStore((s) => s.purchaseGear);
  const equipGear      = useGameStore((s) => s.equipGear);
  const equipLootGear  = useGameStore((s) => s.equipLootGear);
  const unequipLootGear = useGameStore((s) => s.unequipLootGear);
  const enhanceLootGear = useGameStore((s) => s.enhanceLootGear);
  const salvageLootGear = useGameStore((s) => s.salvageLootGear);
  const installMod      = useGameStore((s) => s.installMod);
  const removeMod       = useGameStore((s) => s.removeMod);
  const unlockTalentNode  = useGameStore((s) => s.unlockTalentNode);
  const respecTalentTree  = useGameStore((s) => s.respecTalentTree);

  const masteryLevel = Math.floor((workshopLevels["enhancement_mastery"] ?? 0) * 3);
  const maxEnhance   = getMaxEnhancementLevel(masteryLevel);
  const salvageBonus = (workshopLevels["gear_recycler"] ?? 0) * 0.25;

  const bonuses = getGearBonuses(equippedGear, equippedLootGear, lootGearInventory, unlockedTalentNodes, TALENT_NODES);

  const TABS: { id: LockerTab; label: string; badge?: number }[] = [
    { id: "outfit",  label: "Outfit" },
    { id: "loot",    label: "Loot Gear", badge: lootGearInventory.length },
    { id: "mods",    label: "Mods",      badge: gearModInventory.length },
    { id: "talents", label: "Talents" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "bg-orange-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 rounded-full bg-zinc-700 px-1.5 py-0.5 text-xs font-bold text-zinc-300">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Outfit tab */}
      {activeTab === "outfit" && (
        <OutfitTab
          equippedGear={equippedGear}
          equippedLootGear={equippedLootGear}
          lootGearInventory={lootGearInventory}
          ownedGearIds={ownedGearIds}
          scrapBucks={scrapBucks}
          repPoints={repPoints}
          maxEnhance={maxEnhance}
          salvageBonus={salvageBonus}
          purchaseGear={purchaseGear}
          equipGear={equipGear}
          equipLootGear={equipLootGear}
          unequipLootGear={unequipLootGear}
          enhanceLootGear={enhanceLootGear}
          salvageLootGear={salvageLootGear}
        />
      )}

      {/* Loot Gear tab */}
      {activeTab === "loot" && (
        <LootGearTab
          lootGearInventory={lootGearInventory}
          equippedLootGear={equippedLootGear}
          scrapBucks={scrapBucks}
          maxEnhance={maxEnhance}
          salvageBonus={salvageBonus}
          equipLootGear={equipLootGear}
          unequipLootGear={unequipLootGear}
          enhanceLootGear={enhanceLootGear}
          salvageLootGear={salvageLootGear}
        />
      )}

      {/* Mods tab */}
      {activeTab === "mods" && (
        <ModsTab
          gearModInventory={gearModInventory}
          lootGearInventory={lootGearInventory}
          equippedLootGear={equippedLootGear}
          installMod={installMod}
          removeMod={removeMod}
          careefulModding={(workshopLevels["careful_modding"] ?? 0) >= 1}
        />
      )}

      {/* Talents tab */}
      {activeTab === "talents" && (
        <TalentsTab
          unlockedTalentNodes={unlockedTalentNodes}
          scrapBucks={scrapBucks}
          unlockTalentNode={unlockTalentNode}
          respecTalentTree={respecTalentTree}
        />
      )}

      {/* Active bonuses summary (always shown) */}
      <BonusSummary bonuses={bonuses} />
    </div>
  );
}

// ── Outfit Tab ───────────────────────────────────────────────────────────────
function OutfitTab({
  equippedGear, equippedLootGear, lootGearInventory, ownedGearIds,
  scrapBucks, repPoints, maxEnhance, salvageBonus,
  purchaseGear, equipGear, equipLootGear, unequipLootGear, enhanceLootGear, salvageLootGear,
}: {
  equippedGear: Record<GearSlot, string>;
  equippedLootGear: Record<GearSlot, string | null>;
  lootGearInventory: LootGearItem[];
  ownedGearIds: string[];
  scrapBucks: number;
  repPoints: number;
  maxEnhance: number;
  salvageBonus: number;
  purchaseGear: (id: string) => void;
  equipGear: (id: string) => void;
  equipLootGear: (id: string) => void;
  unequipLootGear: (slot: GearSlot) => void;
  enhanceLootGear: (id: string) => void;
  salvageLootGear: (id: string) => void;
}) {
  const [expandedSlot, setExpandedSlot] = useState<GearSlot | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Your Outfit</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {GEAR_SLOTS.map((slot) => {
          const lootId = equippedLootGear[slot];
          const lootItem = lootId ? lootGearInventory.find((g) => g.id === lootId) : null;
          const staticDef = getGearById(equippedGear[slot]);
          const slotInfo = GEAR_SLOT_LABELS[slot];
          const isExpanded = expandedSlot === slot;

          return (
            <button
              key={slot}
              onClick={() => setExpandedSlot(isExpanded ? null : slot)}
              className={`rounded-lg border p-2.5 text-left transition-colors ${
                isExpanded ? "border-orange-600 bg-zinc-800" : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{slotInfo.icon}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{slotInfo.label}</span>
                {lootItem && (
                  <span className={`ml-auto text-xs font-bold ${RARITY_COLORS[lootItem.rarity]}`}>
                    {RARITY_LABELS[lootItem.rarity][0]}
                  </span>
                )}
              </div>
              {lootItem ? (
                <div className="mt-1">
                  <span className={`text-sm font-semibold ${RARITY_COLORS[lootItem.rarity]}`}>{lootItem.name}</span>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Enh. +{lootItem.enhancementLevel}{lootItem.mods.length > 0 ? ` · ${lootItem.mods.length} mod${lootItem.mods.length > 1 ? "s" : ""}` : ""}
                  </div>
                </div>
              ) : staticDef ? (
                <div className="mt-1">
                  <span className={`text-sm font-semibold ${TIER_COLORS[staticDef.tier] ?? "text-white"}`}>{staticDef.name}</span>
                  {staticDef.effects.length > 0 && (
                    <div className="mt-0.5">
                      {staticDef.effects.map((e, i) => (
                        <span key={i} className={`text-xs ${e.value < 0 ? "text-red-400" : "text-green-400"}`}>
                          {effectLabel(e.type, e.value)}{i < staticDef.effects.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Expanded slot panel */}
      {expandedSlot && (
        <SlotPanel
          slot={expandedSlot}
          scrapBucks={scrapBucks}
          repPoints={repPoints}
          equippedGearId={equippedGear[expandedSlot]}
          equippedLootGearId={equippedLootGear[expandedSlot]}
          ownedGearIds={ownedGearIds}
          lootGearForSlot={lootGearInventory.filter((g) => g.slot === expandedSlot)}
          maxEnhance={maxEnhance}
          salvageBonus={salvageBonus}
          purchaseGear={purchaseGear}
          equipGear={equipGear}
          equipLootGear={equipLootGear}
          unequipLootGear={unequipLootGear}
          enhanceLootGear={enhanceLootGear}
          salvageLootGear={salvageLootGear}
        />
      )}
    </div>
  );
}

function SlotPanel({
  slot, scrapBucks, repPoints, equippedGearId, equippedLootGearId,
  ownedGearIds, lootGearForSlot, maxEnhance, salvageBonus,
  purchaseGear, equipGear, equipLootGear, unequipLootGear, enhanceLootGear, salvageLootGear,
}: {
  slot: GearSlot;
  scrapBucks: number;
  repPoints: number;
  equippedGearId: string;
  equippedLootGearId: string | null;
  ownedGearIds: string[];
  lootGearForSlot: LootGearItem[];
  maxEnhance: number;
  salvageBonus: number;
  purchaseGear: (id: string) => void;
  equipGear: (id: string) => void;
  equipLootGear: (id: string) => void;
  unequipLootGear: (slot: GearSlot) => void;
  enhanceLootGear: (id: string) => void;
  salvageLootGear: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<"shop" | "loot">(lootGearForSlot.length > 0 ? "loot" : "shop");
  const slotInfo = GEAR_SLOT_LABELS[slot];
  const staticItems = getGearForSlot(slot);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span>{slotInfo.icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">{slotInfo.label}</h3>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setSubTab("shop")}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${subTab === "shop" ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >Shop</button>
          <button
            onClick={() => setSubTab("loot")}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${subTab === "loot" ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Loot {lootGearForSlot.length > 0 && <span className="ml-1 rounded-full bg-orange-600/80 px-1 text-white">{lootGearForSlot.length}</span>}
          </button>
        </div>
      </div>

      {subTab === "shop" && (
        <div className="flex flex-col gap-2">
          {staticItems.map((gear) => {
            const owned = ownedGearIds.includes(gear.id);
            const equipped = equippedGearId === gear.id && !equippedLootGearId;
            const canAfford = scrapBucks >= gear.cost;
            const meetsRep = !gear.unlockRequirement?.repPoints || repPoints >= gear.unlockRequirement.repPoints;
            const locked = !meetsRep;
            return (
              <div key={gear.id} className={`rounded-md border p-2.5 ${
                equipped ? "border-orange-600/50 bg-orange-900/10"
                : locked  ? "border-zinc-800 bg-zinc-900/50 opacity-50"
                : owned   ? "border-green-800/50 bg-green-900/10"
                : TIER_BORDER[gear.tier] + " bg-zinc-800/50"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-semibold ${TIER_COLORS[gear.tier] ?? "text-white"}`}>{gear.name}</span>
                      <span className="text-xs text-zinc-600">T{gear.tier}</span>
                      {equipped && <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-semibold text-orange-400">EQUIPPED</span>}
                      {owned && !equipped && <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs font-semibold text-green-400">OWNED</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">{gear.description}</p>
                    {gear.effects.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-2">
                        {gear.effects.map((e, i) => (
                          <span key={i} className={`text-xs font-mono ${e.value < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {effectLabel(e.type, e.value)}
                          </span>
                        ))}
                      </div>
                    )}
                    {locked && gear.unlockRequirement?.repPoints && (
                      <p className="mt-1 text-xs text-zinc-600">Requires {formatNumber(gear.unlockRequirement.repPoints)} Rep</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {!owned && !locked && (
                      <button onClick={() => purchaseGear(gear.id)} disabled={!canAfford}
                        className="rounded border border-orange-600 px-2.5 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40">
                        {gear.cost === 0 ? "FREE" : `$${formatNumber(gear.cost)}`}
                      </button>
                    )}
                    {owned && !equipped && (
                      <button onClick={() => equipGear(gear.id)}
                        className="rounded border border-green-600 px-2.5 py-1 text-xs font-semibold text-green-400 hover:bg-green-600/20">
                        Equip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {subTab === "loot" && (
        <div className="flex flex-col gap-2">
          {lootGearForSlot.length === 0 && (
            <p className="text-xs text-zinc-600 italic">No loot gear found for this slot yet. Race and scavenge to find drops!</p>
          )}
          {/* Show "none equipped" option if loot is equipped */}
          {equippedLootGearId && (
            <button onClick={() => unequipLootGear(slot)}
              className="rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200">
              Unequip loot gear (revert to shop item)
            </button>
          )}
          {lootGearForSlot.map((item) => (
            <LootGearCard
              key={item.id}
              item={item}
              isEquipped={equippedLootGearId === item.id}
              scrapBucks={scrapBucks}
              maxEnhance={maxEnhance}
              salvageBonus={salvageBonus}
              onEquip={() => equipLootGear(item.id)}
              onEnhance={() => enhanceLootGear(item.id)}
              onSalvage={() => salvageLootGear(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Loot Gear Tab ────────────────────────────────────────────────────────────
function LootGearTab({
  lootGearInventory, equippedLootGear, scrapBucks, maxEnhance, salvageBonus,
  equipLootGear, unequipLootGear, enhanceLootGear, salvageLootGear,
}: {
  lootGearInventory: LootGearItem[];
  equippedLootGear: Record<GearSlot, string | null>;
  scrapBucks: number;
  maxEnhance: number;
  salvageBonus: number;
  equipLootGear: (id: string) => void;
  unequipLootGear: (slot: GearSlot) => void;
  enhanceLootGear: (id: string) => void;
  salvageLootGear: (id: string) => void;
}) {
  const [slotFilter, setSlotFilter] = useState<GearSlot | "all">("all");

  const filtered = slotFilter === "all"
    ? lootGearInventory
    : lootGearInventory.filter((g) => g.slot === slotFilter);

  if (lootGearInventory.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p className="text-sm text-zinc-500">No loot gear yet.</p>
        <p className="mt-1 text-xs text-zinc-600">Race and scavenge to find gear drops. Better races drop rarer gear.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Slot filter */}
      <div className="flex flex-wrap gap-1">
        {(["all", ...GEAR_SLOTS] as (GearSlot | "all")[]).map((s) => (
          <button key={s} onClick={() => setSlotFilter(s)}
            className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
              slotFilter === s ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {s === "all" ? "All" : GEAR_SLOT_LABELS[s].label}
            {s !== "all" && (
              <span className="ml-1 text-zinc-600">
                {lootGearInventory.filter((g) => g.slot === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-zinc-600 italic">No items for this slot.</p>
      )}

      {filtered.map((item) => (
        <LootGearCard
          key={item.id}
          item={item}
          isEquipped={equippedLootGear[item.slot] === item.id}
          scrapBucks={scrapBucks}
          maxEnhance={maxEnhance}
          salvageBonus={salvageBonus}
          onEquip={() => equipLootGear(item.id)}
          onEnhance={() => enhanceLootGear(item.id)}
          onSalvage={() => salvageLootGear(item.id)}
          showUnequip={equippedLootGear[item.slot] === item.id}
          onUnequip={() => unequipLootGear(item.slot)}
        />
      ))}
    </div>
  );
}

// ── Loot Gear Card ───────────────────────────────────────────────────────────
function LootGearCard({
  item, isEquipped, scrapBucks, maxEnhance, salvageBonus,
  onEquip, onEnhance, onSalvage, showUnequip, onUnequip,
}: {
  item: LootGearItem;
  isEquipped: boolean;
  scrapBucks: number;
  maxEnhance: number;
  salvageBonus: number;
  onEquip: () => void;
  onEnhance: () => void;
  onSalvage: () => void;
  showUnequip?: boolean;
  onUnequip?: () => void;
}) {
  const enhanceCost   = getEnhancementCost(item);
  const canEnhance    = item.enhancementLevel < maxEnhance;
  const canAfford     = scrapBucks >= enhanceCost;
  const salvageValue  = getSalvageValue(item, salvageBonus);
  const enhancedEffects = getEnhancedEffects(item);

  return (
    <div className={`rounded-md border p-3 ${isEquipped ? "border-orange-600/50 bg-orange-900/10" : `${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]}`}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-sm font-bold ${RARITY_COLORS[item.rarity]}`}>{item.name}</span>
            <span className={`rounded px-1 py-0.5 text-xs font-semibold ${RARITY_COLORS[item.rarity]} bg-zinc-800`}>
              {RARITY_LABELS[item.rarity]}
            </span>
            <span className="text-xs text-zinc-600 capitalize">{GEAR_SLOT_LABELS[item.slot].icon} {item.slot}</span>
            {isEquipped && <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-semibold text-orange-400">EQUIPPED</span>}
          </div>

          {/* Effects */}
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
            {enhancedEffects.map((e, i) => (
              <span key={i} className="text-xs font-mono text-emerald-400">{effectLabel(e.type, e.value)}</span>
            ))}
            {item.mods.map((mod, i) => (
              <span key={`mod-${i}`} className="text-xs font-mono text-yellow-400">
                {effectLabel(mod.effectType, mod.value)} <span className="text-zinc-600">[mod]</span>
              </span>
            ))}
          </div>

          {/* Enhancement progress */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Enh.</span>
            <div className="flex gap-0.5">
              {Array.from({ length: maxEnhance }, (_, i) => (
                <div key={i} className={`h-1.5 w-3 rounded-sm ${i < item.enhancementLevel ? "bg-orange-500" : "bg-zinc-700"}`} />
              ))}
            </div>
            <span className="text-xs text-zinc-500">{item.enhancementLevel}/{maxEnhance}</span>
            {item.modSlots > 0 && (
              <span className="ml-1 text-xs text-zinc-500">
                · {item.mods.length}/{item.modSlots} mod{item.modSlots > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Source flavor */}
          <p className="mt-1 text-xs text-zinc-700 italic">Found at: {item.source}</p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-1">
          {!isEquipped && (
            <button onClick={onEquip}
              className="rounded border border-green-600 px-2 py-1 text-xs font-semibold text-green-400 hover:bg-green-600/20">
              Equip
            </button>
          )}
          {showUnequip && onUnequip && (
            <button onClick={onUnequip}
              className="rounded border border-zinc-600 px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-zinc-600/20">
              Unequip
            </button>
          )}
          {canEnhance && (
            <button onClick={onEnhance} disabled={!canAfford}
              className="rounded border border-orange-700 px-2 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-700/20 disabled:cursor-not-allowed disabled:opacity-40">
              +Enh ${formatNumber(enhanceCost)}
            </button>
          )}
          {!canEnhance && (
            <span className="text-xs text-zinc-600 px-2">Max enh.</span>
          )}
          <button onClick={onSalvage}
            className="rounded border border-zinc-700 px-2 py-1 text-xs font-semibold text-zinc-500 hover:border-red-700 hover:text-red-400">
            Salvage ${formatNumber(salvageValue)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mods Tab ─────────────────────────────────────────────────────────────────
function ModsTab({
  gearModInventory, lootGearInventory, equippedLootGear,
  installMod, removeMod, careefulModding,
}: {
  gearModInventory: InstalledMod[];
  lootGearInventory: LootGearItem[];
  equippedLootGear: Record<GearSlot, string | null>;
  installMod: (lootGearId: string, modInstanceId: string) => void;
  removeMod: (lootGearId: string, modIndex: number) => void;
  careefulModding: boolean;
}) {
  const [selectedMod, setSelectedMod] = useState<string | null>(null);

  // Items that have open mod slots
  const itemsWithSlots = lootGearInventory.filter((g) => g.mods.length < g.modSlots);

  // Items that have installed mods
  const itemsWithMods = lootGearInventory.filter((g) => g.mods.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Available mods */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">Available Mods</h3>
        {gearModInventory.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No mods in inventory. Rare drops from races and scavenging.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {gearModInventory.map((mod) => {
              const template = getModTemplateById(mod.templateId);
              const isSelected = selectedMod === mod.id;
              return (
                <div key={mod.id}
                  className={`rounded-md border p-2.5 cursor-pointer transition-colors ${isSelected ? "border-yellow-600 bg-yellow-900/10" : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"}`}
                  onClick={() => setSelectedMod(isSelected ? null : mod.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-yellow-400">{mod.name}</span>
                      <span className="ml-2 text-xs font-mono text-emerald-400">{effectLabel(mod.effectType, mod.value)}</span>
                      {template && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Fits: {template.slots.map((s) => GEAR_SLOT_LABELS[s].label).join(", ")}
                        </p>
                      )}
                    </div>
                    {isSelected && <span className="text-xs text-yellow-500">Select gear to install →</span>}
                  </div>

                  {/* Install targets when selected */}
                  {isSelected && itemsWithSlots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-zinc-700 pt-2">
                      {itemsWithSlots
                        .filter((item) => !template || template.slots.includes(item.slot))
                        .map((item) => (
                          <button key={item.id}
                            onClick={(e) => { e.stopPropagation(); installMod(item.id, mod.id); setSelectedMod(null); }}
                            className={`rounded border px-2 py-0.5 text-xs font-semibold transition-colors ${RARITY_BORDER[item.rarity]} ${RARITY_COLORS[item.rarity]} hover:opacity-80`}>
                            {item.name}
                          </button>
                        ))}
                      {itemsWithSlots.filter((item) => !template || template.slots.includes(item.slot)).length === 0 && (
                        <p className="text-xs text-zinc-600">No compatible gear with open mod slots.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Installed mods management */}
      {itemsWithMods.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">Installed Mods</h3>
          <div className="flex flex-col gap-2">
            {itemsWithMods.map((item) => (
              <div key={item.id} className={`rounded-md border p-2.5 ${RARITY_BORDER[item.rarity]} bg-zinc-900/50`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className={`text-sm font-semibold ${RARITY_COLORS[item.rarity]}`}>{item.name}</span>
                  <span className="text-xs text-zinc-600">{GEAR_SLOT_LABELS[item.slot].icon} {item.slot}</span>
                  {equippedLootGear[item.slot] === item.id && (
                    <span className="rounded bg-orange-500/20 px-1 py-0.5 text-xs text-orange-400">EQUIPPED</span>
                  )}
                </div>
                {item.mods.map((mod, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-yellow-400">
                      {mod.name} — <span className="font-mono text-emerald-400">{effectLabel(mod.effectType, mod.value)}</span>
                    </span>
                    <button
                      onClick={() => removeMod(item.id, idx)}
                      className="ml-2 rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-500 hover:border-red-700 hover:text-red-400"
                    >
                      {careefulModding ? "Remove" : "Remove (destroys)"}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!careefulModding && gearModInventory.length > 0 && (
        <p className="text-xs text-zinc-600 italic">
          Removing a mod destroys it. Unlock <span className="text-zinc-400">Careful Modding</span> in the Workshop Gear Lab to preserve mods.
        </p>
      )}
    </div>
  );
}

// ── Talents Tab ──────────────────────────────────────────────────────────────
function TalentsTab({
  unlockedTalentNodes, scrapBucks, unlockTalentNode, respecTalentTree,
}: {
  unlockedTalentNodes: string[];
  scrapBucks: number;
  unlockTalentNode: (nodeId: string) => void;
  respecTalentTree: (treeId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-zinc-500">
        Choose a path in each talent tree. Paths branch at tier 2 — pick one direction.
        Respec a tree at any time for a fee (costs 1.5× what you spent). Talents persist through prestige.
      </p>
      {TALENT_TREES.map((tree) => {
        const nodes = getTalentNodesForTree(tree.id).sort((a, b) => a.tier - b.tier);
        const tier1 = nodes.filter((n) => n.tier === 1);
        const tier2 = nodes.filter((n) => n.tier === 2);
        const tier3 = nodes.filter((n) => n.tier === 3);

        const unlockedInTree = nodes.filter((n) => unlockedTalentNodes.includes(n.id));
        const respecCost = Math.floor(unlockedInTree.reduce((s, n) => s + n.cost, 0) * 1.5);
        const canRespec = unlockedInTree.length > 0 && scrapBucks >= respecCost;
        const hasNodes = unlockedInTree.length > 0;

        return (
          <div key={tree.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            {/* Tree header */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{tree.icon}</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">{tree.name}</h3>
                  <p className="text-xs text-zinc-500">{tree.description}</p>
                </div>
              </div>
              {hasNodes && (
                <button
                  onClick={() => respecTalentTree(tree.id)}
                  disabled={!canRespec}
                  title={`Reset all ${tree.name} talents. Cost: $${formatNumber(respecCost)}`}
                  className="shrink-0 rounded border border-red-800 px-2 py-1 text-xs text-red-500 hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Respec (${formatNumber(respecCost)})
                </button>
              )}
            </div>

            {/* Tier 1 (root) */}
            <div className="flex flex-col gap-2">
              {tier1.map((node) => (
                <TalentNodeRow
                  key={node.id}
                  node={node}
                  unlockedTalentNodes={unlockedTalentNodes}
                  scrapBucks={scrapBucks}
                  unlockTalentNode={unlockTalentNode}
                  label="Root"
                />
              ))}
            </div>

            {/* Tier 2 branch fork */}
            {tier2.length > 0 && (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Choose a Path</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
                <div className="flex flex-col gap-2">
                  {tier2.map((node) => {
                    const exclusiveUnlocked = node.mutuallyExclusiveWith
                      ? unlockedTalentNodes.includes(node.mutuallyExclusiveWith)
                      : false;
                    return (
                      <TalentNodeRow
                        key={node.id}
                        node={node}
                        unlockedTalentNodes={unlockedTalentNodes}
                        scrapBucks={scrapBucks}
                        unlockTalentNode={unlockTalentNode}
                        label="Branch"
                        forceBlocked={exclusiveUnlocked}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 3 (capstone — only show nodes whose prereq branch is unlocked) */}
            {tier3.filter((n) => !n.prerequisiteNodeId || unlockedTalentNodes.includes(n.prerequisiteNodeId)).length > 0 && (
              <div className="mt-2">
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Capstone</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
                <div className="flex flex-col gap-2">
                  {tier3
                    .filter((n) => !n.prerequisiteNodeId || unlockedTalentNodes.includes(n.prerequisiteNodeId))
                    .map((node) => (
                      <TalentNodeRow
                        key={node.id}
                        node={node}
                        unlockedTalentNodes={unlockedTalentNodes}
                        scrapBucks={scrapBucks}
                        unlockTalentNode={unlockTalentNode}
                        label="Capstone"
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TalentNodeRow({
  node, unlockedTalentNodes, scrapBucks, unlockTalentNode, forceBlocked = false,
}: {
  node: import("@/data/talentNodes").TalentNode;
  unlockedTalentNodes: string[];
  scrapBucks: number;
  unlockTalentNode: (nodeId: string) => void;
  label?: string;
  forceBlocked?: boolean;
}) {
  const unlocked = unlockedTalentNodes.includes(node.id);
  const meetsPrereq = !node.prerequisiteNodeId || unlockedTalentNodes.includes(node.prerequisiteNodeId);
  const available = meetsPrereq && !unlocked && !forceBlocked;
  const canAfford = scrapBucks >= node.cost;

  return (
    <div className={`flex items-start gap-3 rounded-md border p-2.5 transition-colors ${
      unlocked      ? "border-green-800/50 bg-green-900/10"
      : forceBlocked ? "border-zinc-800 bg-zinc-900/20 opacity-30"
      : available    ? "border-zinc-600 bg-zinc-800/50"
      : "border-zinc-800 bg-zinc-900/30 opacity-50"
    }`}>
      <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
        unlocked ? "border-green-500 bg-green-500"
        : forceBlocked ? "border-zinc-800"
        : available ? "border-zinc-500"
        : "border-zinc-700"
      }`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold ${unlocked ? "text-green-400" : forceBlocked ? "text-zinc-600" : "text-zinc-200"}`}>
            {node.name}
          </span>
          <span className="text-xs font-mono text-emerald-400">{effectLabel(node.effect.type, node.effect.value)}</span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{node.description}</p>
      </div>
      {!unlocked && available && (
        <button
          onClick={() => unlockTalentNode(node.id)}
          disabled={!canAfford}
          className="shrink-0 rounded border border-orange-600 px-2 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ${formatNumber(node.cost)}
        </button>
      )}
      {unlocked && (
        <span className="shrink-0 text-xs text-green-500">Unlocked</span>
      )}
    </div>
  );
}

// ── Bonus Summary ────────────────────────────────────────────────────────────
function BonusSummary({ bonuses }: { bonuses: ReturnType<typeof getGearBonuses> }) {
  const entries = Object.entries(bonuses).filter(([, v]) => v !== 0);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Active Gear Bonuses</h3>
        <p className="mt-1 text-xs text-zinc-600">No gear bonuses active. Equip better gear to get bonuses.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">Active Gear Bonuses</h3>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([type, value]) => (
          <span key={type} className={`text-xs font-mono ${value < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {effectLabel(type, value)}
          </span>
        ))}
      </div>
    </div>
  );
}
