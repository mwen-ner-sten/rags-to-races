"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import SkillsSubTab from "./SkillsSubTab";
import AttributesSubTab from "./AttributesSubTab";
import CrewPanel from "@/components/Crew/CrewPanel";
import {
  GEAR_SLOTS,
  GEAR_SLOT_LABELS,
  type GearSlot,
} from "@/data/gearSlots";
import {
  getGearBonuses,
  getGearAttributes,
  type GearAttributes,
} from "@/engine/gear";
import {
  RARITY_COLORS,
  RARITY_BORDER,
  RARITY_BG,
  RARITY_LABELS,
  type LootGearItem,
  type InstalledMod,
} from "@/data/lootGear";
import {
  GEAR_ATTRIBUTES,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_SHORT_LABELS,
  RACER_ATTRIBUTES,
  VEHICLE_ATTRIBUTES,
  parseAttributeEffectType,
  type GearAttributeId,
} from "@/data/gearAttributes";
import { getModTemplateById } from "@/data/gearMods";
import { getGearSetById } from "@/data/gearSets";
import { getActiveSets, type ActiveSetInfo } from "@/engine/gearSets";
import { TALENT_NODES } from "@/data/talentNodes";
import { getEnhancementCost, getMaxEnhancementLevel, getEnhancedEffects, getSalvageValue } from "@/engine/gearEnhance";
import { FORGE_COST } from "@/engine/forge";
import { REFORGE_COST_SHARDS } from "@/engine/reforge";
import { formatNumber } from "@/utils/format";

// ── Effect label helper ──────────────────────────────────────────────────────
function effectLabel(type: string, value: number): string {
  const attrId = parseAttributeEffectType(type);
  if (attrId) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value)} ${ATTRIBUTE_LABELS[attrId]}`;
  }
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

type LockerTab = "gear" | "mods" | "skills" | "attributes" | "crew";

// ── Main component ───────────────────────────────────────────────────────────
export default function LockerPanel() {
  const [activeTab, setActiveTab] = useState<LockerTab>("gear");

  const scrapBucks        = useGameStore((s) => s.scrapBucks);
  const reforgeShards     = useGameStore((s) => s.reforgeShards);
  const equippedGear      = useGameStore((s) => s.equippedGear);
  const equippedLootGear  = useGameStore((s) => s.equippedLootGear);
  const lootGearInventory = useGameStore((s) => s.lootGearInventory);
  const gearModInventory  = useGameStore((s) => s.gearModInventory);
  const unlockedTalentNodes = useGameStore((s) => s.unlockedTalentNodes);
  const workshopLevels    = useGameStore((s) => s.workshopLevels);

  const equipLootGear  = useGameStore((s) => s.equipLootGear);
  const unequipLootGear = useGameStore((s) => s.unequipLootGear);
  const enhanceLootGear = useGameStore((s) => s.enhanceLootGear);
  const salvageLootGear = useGameStore((s) => s.salvageLootGear);
  const forgeGearItem   = useGameStore((s) => s.forgeGearItem);
  const reforgeLootGear = useGameStore((s) => s.reforgeLootGear);
  const installMod      = useGameStore((s) => s.installMod);
  const removeMod       = useGameStore((s) => s.removeMod);

  const masteryLevel = Math.floor((workshopLevels["enhancement_mastery"] ?? 0) * 3);
  const maxEnhance   = getMaxEnhancementLevel(masteryLevel);
  const salvageBonus = (workshopLevels["gear_recycler"] ?? 0) * 0.25;

  const bonuses = getGearBonuses(equippedGear, equippedLootGear, lootGearInventory, unlockedTalentNodes, TALENT_NODES);
  const attributes = getGearAttributes(equippedLootGear, lootGearInventory, unlockedTalentNodes, TALENT_NODES);
  const activeSets = getActiveSets(equippedLootGear, lootGearInventory);
  const unlockedFeatures = useGameStore((s) => s.unlockedFeatures);

  const allTabs: { id: LockerTab; label: string; badge?: number; show: boolean }[] = [
    { id: "skills",     label: "Skills",     show: true },
    { id: "attributes", label: "Attributes", show: unlockedFeatures.includes("racer_attributes") },
    { id: "gear",       label: "Gear",       badge: lootGearInventory.length, show: true },
    { id: "mods",       label: "Mods",       badge: gearModInventory.length, show: true },
    { id: "crew",       label: "Crew",       show: unlockedFeatures.includes("crew_system") },
  ];
  const TABS = allTabs.filter((t) => t.show);

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

      {/* Skills / Attributes / Crew */}
      {activeTab === "skills" && <SkillsSubTab />}
      {activeTab === "attributes" && <AttributesSubTab />}
      {activeTab === "crew" && <CrewPanel />}

      {/* Gear tab */}
      {activeTab === "gear" && (
        <GearTab
          lootGearInventory={lootGearInventory}
          equippedLootGear={equippedLootGear}
          scrapBucks={scrapBucks}
          reforgeShards={reforgeShards}
          maxEnhance={maxEnhance}
          salvageBonus={salvageBonus}
          attributes={attributes}
          activeSets={activeSets}
          equipLootGear={equipLootGear}
          unequipLootGear={unequipLootGear}
          enhanceLootGear={enhanceLootGear}
          salvageLootGear={salvageLootGear}
          forgeGearItem={forgeGearItem}
          reforgeLootGear={reforgeLootGear}
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

      {/* Active bonuses summary (always shown) */}
      {activeTab !== "crew" && activeTab !== "skills" && activeTab !== "attributes" && (
        <BonusSummary bonuses={bonuses} />
      )}
    </div>
  );
}

// ── Attribute Summary Card ──────────────────────────────────────────────────
function AttributeSummary({ attrs }: { attrs: GearAttributes }) {
  const hasAny = GEAR_ATTRIBUTES.some((id) => attrs[id] !== 0);
  if (!hasAny) {
    return (
      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: "var(--panel-border, #27272a)",
          background: "var(--panel-bg, rgba(24,24,27,0.5))",
        }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted, #71717a)" }}>
          Total Attributes
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted, #71717a)" }}>
          Equip gear to earn attribute points.
        </p>
      </div>
    );
  }

  const renderRow = (ids: readonly GearAttributeId[], label: string) => (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-muted, #71717a)" }}>
        {label}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {ids.map((id) => {
          const v = attrs[id];
          const inactive = v === 0;
          return (
            <div
              key={id}
              className="rounded border px-2 py-1.5 text-center"
              style={{
                borderColor: inactive
                  ? "var(--panel-border, #27272a)"
                  : "var(--accent-border, rgba(200,62,12,.4))",
                background: inactive
                  ? "var(--panel-bg, rgba(24,24,27,0.3))"
                  : "var(--accent-bg, rgba(200,62,12,.08))",
              }}
              title={ATTRIBUTE_LABELS[id]}
            >
              <div
                className="text-xs font-bold"
                style={{ color: inactive ? "var(--text-muted, #52525b)" : "var(--accent, #c83e0c)" }}
              >
                {ATTRIBUTE_SHORT_LABELS[id]}
              </div>
              <div
                className="font-mono text-sm"
                style={{ color: inactive ? "var(--text-muted, #52525b)" : "var(--text-primary, #e4e4e7)" }}
              >
                {v > 0 ? `+${v}` : v}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--panel-border, #3f3f46)",
        background: "var(--panel-bg, rgba(24,24,27,0.75))",
      }}
    >
      <h3
        className="mb-3 text-sm font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-secondary, #a1a1aa)" }}
      >
        Total Attributes
      </h3>
      <div className="flex flex-col gap-3">
        {renderRow(RACER_ATTRIBUTES, "Racer")}
        {renderRow(VEHICLE_ATTRIBUTES, "Vehicle")}
      </div>
    </div>
  );
}

// ── Set Bonuses Card ────────────────────────────────────────────────────────
function SetBonusesCard({ activeSets }: { activeSets: ActiveSetInfo[] }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--panel-border, #3f3f46)",
        background: "var(--panel-bg, rgba(24,24,27,0.75))",
      }}
    >
      <h3
        className="mb-2 text-sm font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-secondary, #a1a1aa)" }}
      >
        Set Bonuses
      </h3>
      <div className="flex flex-col gap-2">
        {activeSets.map(({ set, piecesEquipped, activeTiers }) => (
          <div key={set.id} className="rounded border border-zinc-700 bg-zinc-900/50 p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400">{set.name}</span>
              <span className="text-xs font-mono text-zinc-500">
                {piecesEquipped}/{set.slots.length} pieces
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {set.tiers.map((tier) => {
                const active = activeTiers.includes(tier);
                return (
                  <div key={tier.piecesRequired} className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${active ? "text-amber-300" : "text-zinc-600"}`}
                    >
                      ({tier.piecesRequired})
                    </span>
                    <span className={`text-xs ${active ? "text-emerald-300" : "text-zinc-600"}`}>
                      {tier.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gear Tab ────────────────────────────────────────────────────────────────
function GearTab({
  lootGearInventory, equippedLootGear, scrapBucks, reforgeShards, maxEnhance, salvageBonus,
  attributes, activeSets,
  equipLootGear, unequipLootGear, enhanceLootGear, salvageLootGear,
  forgeGearItem, reforgeLootGear,
}: {
  lootGearInventory: LootGearItem[];
  equippedLootGear: Record<GearSlot, string | null>;
  scrapBucks: number;
  reforgeShards: number;
  maxEnhance: number;
  salvageBonus: number;
  attributes: GearAttributes;
  activeSets: ActiveSetInfo[];
  equipLootGear: (id: string) => void;
  unequipLootGear: (slot: GearSlot) => void;
  enhanceLootGear: (id: string) => void;
  salvageLootGear: (id: string) => void;
  forgeGearItem: (slot: GearSlot, rarity: import("@/data/lootGear").GearRarity) => void;
  reforgeLootGear: (id: string) => void;
}) {
  const [slotFilter, setSlotFilter] = useState<GearSlot | "all">("all");

  const filtered = slotFilter === "all"
    ? lootGearInventory
    : lootGearInventory.filter((g) => g.slot === slotFilter);

  return (
    <div className="flex flex-col gap-3">
      {/* Equipped slot row */}
      <EquippedRow
        equippedLootGear={equippedLootGear}
        lootGearInventory={lootGearInventory}
        unequipLootGear={unequipLootGear}
      />

      {/* Attribute summary */}
      <AttributeSummary attrs={attributes} />

      {/* Set bonuses */}
      {activeSets.length > 0 && <SetBonusesCard activeSets={activeSets} />}

      {/* Forge */}
      <ForgeCard scrapBucks={scrapBucks} onForge={forgeGearItem} />

      {/* Reforge Shards counter */}
      <div
        className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs"
        style={{
          borderColor: "var(--panel-border, #3f3f46)",
          background: "var(--panel-bg, rgba(24,24,27,0.5))",
        }}
      >
        <span style={{ color: "var(--text-muted, #71717a)" }}>
          Reforge Shards (from salvage)
        </span>
        <span className="font-mono font-semibold" style={{ color: "var(--accent, #c83e0c)" }}>
          {formatNumber(reforgeShards)}
        </span>
      </div>

      {lootGearInventory.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
          <p className="text-sm text-zinc-500">No gear yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Race, scavenge, forge, or hunt rivals to find gear.
          </p>
        </div>
      ) : (
        <>
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
              reforgeShards={reforgeShards}
              maxEnhance={maxEnhance}
              salvageBonus={salvageBonus}
              onEquip={() => equipLootGear(item.id)}
              onEnhance={() => enhanceLootGear(item.id)}
              onSalvage={() => salvageLootGear(item.id)}
              onReforge={() => reforgeLootGear(item.id)}
              showUnequip={equippedLootGear[item.slot] === item.id}
              onUnequip={() => unequipLootGear(item.slot)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function EquippedRow({
  equippedLootGear, lootGearInventory, unequipLootGear,
}: {
  equippedLootGear: Record<GearSlot, string | null>;
  lootGearInventory: LootGearItem[];
  unequipLootGear: (slot: GearSlot) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {GEAR_SLOTS.map((slot) => {
        const id = equippedLootGear[slot];
        const item = id ? lootGearInventory.find((g) => g.id === id) : null;
        const info = GEAR_SLOT_LABELS[slot];
        return (
          <button
            key={slot}
            onClick={() => item && unequipLootGear(slot)}
            disabled={!item}
            className={`flex flex-col items-center rounded-lg border p-2 text-center transition-colors ${
              item
                ? `${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} hover:opacity-80`
                : "border-zinc-800 bg-zinc-900/50"
            }`}
            title={item ? `${item.name} — click to unequip` : `Empty ${info.label} slot`}
          >
            <span className="text-lg">{info.icon}</span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {info.label}
            </span>
            {item ? (
              <span className={`mt-0.5 truncate text-xs font-semibold ${RARITY_COLORS[item.rarity]}`}>
                {item.name}
              </span>
            ) : (
              <span className="mt-0.5 text-xs text-zinc-700">— empty —</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Loot Gear Card ───────────────────────────────────────────────────────────
function LootGearCard({
  item, isEquipped, scrapBucks, reforgeShards, maxEnhance, salvageBonus,
  onEquip, onEnhance, onSalvage, onReforge, showUnequip, onUnequip,
}: {
  item: LootGearItem;
  isEquipped: boolean;
  scrapBucks: number;
  reforgeShards?: number;
  maxEnhance: number;
  salvageBonus: number;
  onEquip: () => void;
  onEnhance: () => void;
  onSalvage: () => void;
  onReforge?: () => void;
  showUnequip?: boolean;
  onUnequip?: () => void;
}) {
  const enhanceCost   = getEnhancementCost(item);
  const canEnhance    = item.enhancementLevel < maxEnhance;
  const canAfford     = scrapBucks >= enhanceCost;
  const salvageValue  = getSalvageValue(item, salvageBonus);
  const enhancedEffects = getEnhancedEffects(item);

  const attributeEffects = enhancedEffects.filter((e) => parseAttributeEffectType(e.type));
  const otherEffects = enhancedEffects.filter((e) => !parseAttributeEffectType(e.type));

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
            {item.setId && (() => {
              const set = getGearSetById(item.setId);
              return set ? (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
                  {set.name}
                </span>
              ) : null;
            })()}
            {item.unique && (
              <span className="rounded bg-orange-500/20 px-1 py-0.5 text-xs font-bold tracking-wider text-orange-300">
                UNIQUE
              </span>
            )}
            {item.legacy && (
              <span className="rounded bg-zinc-700 px-1 py-0.5 text-xs font-semibold text-zinc-400">
                LEGACY
              </span>
            )}
            {isEquipped && <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-semibold text-orange-400">EQUIPPED</span>}
          </div>

          {/* Attribute grants (lead) */}
          {attributeEffects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
              {attributeEffects.map((e, i) => (
                <span key={`attr-${i}`} className="font-mono text-sm font-semibold text-emerald-300">
                  {effectLabel(e.type, e.value)}
                </span>
              ))}
            </div>
          )}

          {/* Other effects (secondary) */}
          {otherEffects.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {otherEffects.map((e, i) => (
                <span key={`eff-${i}`} className="text-xs font-mono text-emerald-400">
                  {effectLabel(e.type, e.value)}
                </span>
              ))}
            </div>
          )}
          {item.mods.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {item.mods.map((mod, i) => (
                <span key={`mod-${i}`} className="text-xs font-mono text-yellow-400">
                  {effectLabel(mod.effectType, mod.value)} <span className="text-zinc-600">[mod]</span>
                </span>
              ))}
            </div>
          )}

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
          {onReforge && (() => {
            const cost = REFORGE_COST_SHARDS[item.rarity];
            const canReforge = (reforgeShards ?? 0) >= cost;
            return (
              <button
                onClick={onReforge}
                disabled={!canReforge}
                title={`Re-roll secondary affixes for ${cost} shards`}
                className="rounded border border-amber-700 px-2 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-700/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reforge {cost}◆
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Forge Card ──────────────────────────────────────────────────────────────
function ForgeCard({
  scrapBucks, onForge,
}: {
  scrapBucks: number;
  onForge: (slot: GearSlot, rarity: import("@/data/lootGear").GearRarity) => void;
}) {
  const [slot, setSlot] = useState<GearSlot>("head");
  const [rarity, setRarity] = useState<import("@/data/lootGear").GearRarity>("common");
  const cost = FORGE_COST[rarity];
  const canAfford = scrapBucks >= cost;

  const rarities: import("@/data/lootGear").GearRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--panel-border, #3f3f46)",
        background: "var(--panel-bg, rgba(24,24,27,0.75))",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-secondary, #a1a1aa)" }}>
          Forge
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted, #71717a)" }}>
          Craft gear with Scrap Bucks
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Slot select */}
        <div className="flex flex-wrap gap-1">
          {GEAR_SLOTS.map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                slot === s ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title={GEAR_SLOT_LABELS[s].label}
            >
              {GEAR_SLOT_LABELS[s].icon}
            </button>
          ))}
        </div>

        {/* Rarity select */}
        <div className="flex flex-wrap gap-1">
          {rarities.map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={`rounded px-2 py-1 text-xs font-semibold uppercase transition-colors ${
                rarity === r ? `${RARITY_COLORS[r]} bg-zinc-700` : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {r[0]}
            </button>
          ))}
        </div>

        <button
          onClick={() => onForge(slot, rarity)}
          disabled={!canAfford}
          className="ml-auto shrink-0 rounded border border-orange-600 px-3 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Forge ${formatNumber(cost)}
        </button>
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

  const itemsWithSlots = lootGearInventory.filter((g) => g.mods.length < g.modSlots);
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


// ── Bonus Summary ────────────────────────────────────────────────────────────
function BonusSummary({ bonuses }: { bonuses: ReturnType<typeof getGearBonuses> }) {
  const entries = Object.entries(bonuses).filter(([, v]) => v !== 0);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Derived Bonuses</h3>
        <p className="mt-1 text-xs text-zinc-600">Bonuses derived from your attributes will show up here.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">Derived Bonuses</h3>
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
