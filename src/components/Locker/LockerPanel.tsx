"use client";

import { useMemo, useState } from "react";
import { _getUpgradeEffectValue, _getUpgradeLevel, useGameStore } from "@/state/store";
import {
  GEAR_SLOTS,
  GEAR_SLOT_LABELS,
  RARITY_LABELS,
  type GearSlot,
  type InstalledMod,
  type LootGearItem,
} from "@/data/lootGear";
import { getModTemplateById } from "@/data/gearMods";
import { getEnhancementCost, getMaxEnhancementLevel, getSalvageValue, getTotalEffects } from "@/engine/gearEnhance";
import { getPermanentRuntimeBonuses, multiplyReward } from "@/engine/permanentBonuses";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import Stat from "@/components/ui/Stat";
import { Icon } from "@/components/icons/Icon";
import { formatNumber } from "@/utils/format";
import LootGearArt, { RARITY_TOKEN } from "./LootGearArt";
import {
  DEFAULT_LOCKER_FILTER,
  GEAR_CHANNEL_GROUPS,
  GEAR_CHANNEL_LABELS,
  LOCKER_SORT_LABELS,
  RARITY_ORDER,
  compatibleMods,
  computeEquipDelta,
  filterAndSortGear,
  formatChannelValue,
  formatEffect,
  gearPower,
  lootGearAffixArt,
  lootGearBonuses,
  needsSalvageConfirm,
  nextModSlotLevel,
  type EquipDelta,
  type LockerFilter,
  type LockerSort,
} from "./lockerHelpers";

const SELECT_STYLE = {
  background: "var(--panel-bg)",
  color: "var(--text-primary)",
  borderColor: "var(--panel-border)",
} as const;

/**
 * The Locker: every piece of loot gear the player holds, what is equipped in
 * each of the six slots, and what equipping, enhancing, modding, or salvaging
 * a piece would do. Lives as a Workshop section revealed by the first drop.
 */
export default function LockerPanel() {
  const inventory = useGameStore((s) => s.lootGearInventory);
  const equipped = useGameStore((s) => s.equippedLootGear);
  const modBag = useGameStore((s) => s.gearModInventory);
  const [filter, setFilter] = useState<LockerFilter>(DEFAULT_LOCKER_FILTER);

  const totals = useMemo(() => lootGearBonuses(equipped, inventory), [equipped, inventory]);
  const visible = useMemo(() => filterAndSortGear(inventory, filter), [inventory, filter]);
  const equippedCount = GEAR_SLOTS.filter((slot) => equipped[slot]).length;

  return (
    <div className="flex flex-col gap-3" data-testid="locker-panel">
      <GearTotals totals={totals} equippedCount={equippedCount} owned={inventory.length} spareMods={modBag.length} />
      <SlotGrid inventory={inventory} equipped={equipped} />
      <Panel kicker="Inventory" title={`${visible.length} of ${inventory.length} pieces`}>
        <div className="mb-3"><LockerFilters filter={filter} onChange={setFilter} /></div>
        {inventory.length === 0 ? (
          <p className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Nothing in the locker yet. Loot gear drops from scavenging and racing.
          </p>
        ) : visible.length === 0 ? (
          <p className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            No gear matches this filter.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Loot gear inventory">
            {visible.map((item) => (
              <GearCard key={item.id} item={item} inventory={inventory} equipped={equipped} modBag={modBag} />
            ))}
          </ul>
        )}
      </Panel>
      <ModBag mods={modBag} />
    </div>
  );
}

function GearTotals({ totals, equippedCount, owned, spareMods }: {
  totals: ReturnType<typeof lootGearBonuses>;
  equippedCount: number;
  owned: number;
  spareMods: number;
}) {
  return (
    <Panel kicker="Total from gear" title="What the locker adds">
      <div className="mb-3 flex flex-wrap gap-4">
        <Stat size="sm" label="Equipped" value={`${equippedCount} / ${GEAR_SLOTS.length}`} />
        <Stat size="sm" label="Owned" value={owned} />
        <Stat size="sm" label="Spare mods" value={spareMods} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GEAR_CHANNEL_GROUPS.map((group) => (
          <section key={group.id} className="rounded border p-2" style={{ borderColor: "var(--panel-border)" }} aria-label={group.label}>
            <div className="ui-kicker mb-1">{group.label}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {group.channels.map((channel) => {
                const value = totals[channel];
                return (
                  <Stat
                    key={channel}
                    size="sm"
                    label={GEAR_CHANNEL_LABELS[channel]}
                    value={<span data-testid={`locker-total-${channel}`}>{formatChannelValue(channel, value)}</span>}
                    color={value === 0 ? "var(--text-muted)" : "var(--success)"}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function SlotGrid({ inventory, equipped }: { inventory: LootGearItem[]; equipped: Record<GearSlot, string | null> }) {
  const unequip = useGameStore((s) => s.unequipLootGear);
  return (
    <Panel kicker="Loadout" title="Slots">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {GEAR_SLOTS.map((slot) => {
          const item = inventory.find((candidate) => candidate.id === equipped[slot]);
          return (
            <div
              key={slot}
              className="flex flex-col items-center gap-1 rounded border p-2 text-center"
              style={{ borderColor: item ? RARITY_TOKEN[item.rarity] : "var(--panel-border)" }}
              data-testid={`locker-slot-${slot}`}
            >
              <LootGearArt slot={slot} rarity={item?.rarity ?? "common"} affixes={item ? lootGearAffixArt(item) : []} empty={!item} size={56} />
              <div className="ui-kicker">{GEAR_SLOT_LABELS[slot].label}</div>
              {item ? (
                <>
                  <div className="text-xs font-semibold leading-tight" style={{ color: "var(--text-white)" }}>
                    {item.name}
                  </div>
                  <div className="text-[11px]" style={{ color: RARITY_TOKEN[item.rarity] }}>
                    {RARITY_LABELS[item.rarity]} · Lv.{item.enhancementLevel}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => unequip(slot)} aria-label={`Unequip ${item.name}`}>
                    Unequip
                  </Button>
                </>
              ) : (
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Empty</div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LockerFilters({ filter, onChange }: { filter: LockerFilter; onChange: (next: LockerFilter) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span>Slot</span>
        <select
          className="rounded border px-1.5 py-1 text-xs"
          style={SELECT_STYLE}
          value={filter.slot}
          data-testid="locker-filter-slot"
          onChange={(event) => onChange({ ...filter, slot: event.target.value as LockerFilter["slot"] })}
        >
          <option value="all">All</option>
          {GEAR_SLOTS.map((slot) => <option key={slot} value={slot}>{GEAR_SLOT_LABELS[slot].label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span>Rarity</span>
        <select
          className="rounded border px-1.5 py-1 text-xs"
          style={SELECT_STYLE}
          value={filter.rarity}
          data-testid="locker-filter-rarity"
          onChange={(event) => onChange({ ...filter, rarity: event.target.value as LockerFilter["rarity"] })}
        >
          <option value="all">All</option>
          {RARITY_ORDER.map((rarity) => <option key={rarity} value={rarity}>{RARITY_LABELS[rarity]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span>Sort</span>
        <select
          className="rounded border px-1.5 py-1 text-xs"
          style={SELECT_STYLE}
          value={filter.sort}
          data-testid="locker-sort"
          onChange={(event) => onChange({ ...filter, sort: event.target.value as LockerSort })}
        >
          {(Object.keys(LOCKER_SORT_LABELS) as LockerSort[]).map((sort) => (
            <option key={sort} value={sort}>{LOCKER_SORT_LABELS[sort]}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface GearCardProps {
  item: LootGearItem;
  inventory: LootGearItem[];
  equipped: Record<GearSlot, string | null>;
  modBag: InstalledMod[];
}

function GearCard({ item, inventory, equipped, modBag }: GearCardProps) {
  const isEquipped = equipped[item.slot] === item.id;
  const delta = useMemo(
    () => (isEquipped ? [] : computeEquipDelta(item, equipped, inventory)),
    [item, equipped, inventory, isEquipped],
  );
  const effects = getTotalEffects(item);
  const replaces = inventory.find((candidate) => candidate.id === equipped[item.slot]);
  return (
    <li
      className="rounded-lg border p-3"
      style={{ borderColor: isEquipped ? RARITY_TOKEN[item.rarity] : "var(--panel-border)", background: isEquipped ? "var(--accent-bg)" : "var(--panel-bg)" }}
      data-testid={`locker-item-${item.id}`}
    >
      <div className="flex items-start gap-3">
        <LootGearArt slot={item.slot} rarity={item.rarity} affixes={lootGearAffixArt(item)} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <strong className="text-sm" style={{ color: "var(--text-white)" }}>{item.name}</strong>
            <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>Power {gearPower(item)}</span>
          </div>
          <div className="text-[11px] uppercase tracking-wider" style={{ color: RARITY_TOKEN[item.rarity] }}>
            {RARITY_LABELS[item.rarity]} {GEAR_SLOT_LABELS[item.slot].label} · Lv.{item.enhancementLevel} · Mods {item.mods.length}/{item.modSlots}
          </div>
          {isEquipped && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "var(--success)" }}>
              <Icon id="success" size={12} /> Equipped
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 rounded border px-2 py-1.5" style={{ borderColor: "var(--panel-border)" }}>
        <div className="ui-kicker">Affixes {item.enhancementLevel > 0 ? `(+${item.enhancementLevel * 12}% from enhancement)` : ""}</div>
        <ul className="mt-0.5 space-y-0.5">
          {effects.map((effect) => (
            <li key={effect.type} className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatEffect(effect.type, effect.value)}</li>
          ))}
        </ul>
      </div>

      {!isEquipped && <DeltaList delta={delta} replaces={replaces} />}
      <ModSection item={item} modBag={modBag} />
      <GearActions item={item} isEquipped={isEquipped} />
    </li>
  );
}

function DeltaList({ delta, replaces }: { delta: EquipDelta[]; replaces: LootGearItem | undefined }) {
  return (
    <div className="mt-2 rounded border px-2 py-1.5" style={{ borderColor: "var(--panel-border)" }}>
      <div className="ui-kicker">If equipped{replaces ? ` (replaces ${replaces.name})` : ""}</div>
      {delta.length === 0 ? (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>No change to any channel.</p>
      ) : (
        <ul className="mt-0.5 space-y-0.5">
          {delta.map((entry) => {
            const positive = entry.delta > 0;
            return (
              <li key={entry.channel} className="flex justify-between gap-2 text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{GEAR_CHANNEL_LABELS[entry.channel]}</span>
                <span className="font-mono" style={{ color: positive ? "var(--success)" : "var(--danger)" }}>
                  {formatChannelValue(entry.channel, entry.before)} <Icon id="chevron" size={10} /> {formatChannelValue(entry.channel, entry.after)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ModSection({ item, modBag }: { item: LootGearItem; modBag: InstalledMod[] }) {
  const installMod = useGameStore((s) => s.installMod);
  const removeMod = useGameStore((s) => s.removeMod);
  const carefulModding = useGameStore((s) => _getUpgradeLevel(s, "careful_modding") >= 1);
  const options = useMemo(() => compatibleMods(item, modBag), [item, modBag]);
  const [pick, setPick] = useState("");
  const openSockets = item.modSlots - item.mods.length;
  const nextSocket = nextModSlotLevel(item.enhancementLevel);
  const selected = options.some((mod) => mod.id === pick) ? pick : (options[0]?.id ?? "");

  return (
    <div className="mt-2 rounded border px-2 py-1.5" style={{ borderColor: "var(--panel-border)" }}>
      <div className="ui-kicker">Mods {item.mods.length}/{item.modSlots}{nextSocket ? ` · next socket at Lv.${nextSocket}` : ""}</div>
      {item.mods.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {item.mods.map((mod, index) => (
            <li key={mod.id} className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: "var(--text-secondary)" }}>{mod.name}: {formatEffect(mod.effectType, mod.value)}</span>
              <Button size="sm" variant="ghost" onClick={() => removeMod(item.id, index)} title={carefulModding ? "Returns the mod to your spares" : "Destroys the mod (Precision Reforge keeps it)"}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {openSockets > 0 && (
        options.length === 0 ? (
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{openSockets} open socket{openSockets === 1 ? "" : "s"}; no spare mod fits this slot.</p>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select
              className="min-w-0 flex-1 rounded border px-1.5 py-1 text-xs"
              style={SELECT_STYLE}
              value={selected}
              aria-label={`Mod to install on ${item.name}`}
              onChange={(event) => setPick(event.target.value)}
            >
              {options.map((mod) => (
                <option key={mod.id} value={mod.id}>{mod.name} ({formatEffect(mod.effectType, mod.value)})</option>
              ))}
            </select>
            <Button size="sm" onClick={() => installMod(item.id, selected)} disabled={!selected}>Install</Button>
          </div>
        )
      )}
      {item.modSlots === 0 && item.mods.length === 0 && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>No sockets yet.</p>
      )}
    </div>
  );
}

function GearActions({ item, isEquipped }: { item: LootGearItem; isEquipped: boolean }) {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const equip = useGameStore((s) => s.equipLootGear);
  const unequip = useGameStore((s) => s.unequipLootGear);
  const enhance = useGameStore((s) => s.enhanceLootGear);
  const salvage = useGameStore((s) => s.salvageLootGear);
  const maxLevel = useGameStore((s) => getMaxEnhancementLevel(Math.floor(_getUpgradeEffectValue(s, "enhancement_mastery"))));
  const salvageValue = useGameStore((s) => multiplyReward(
    getSalvageValue(item, _getUpgradeEffectValue(s, "gear_recycler")),
    getPermanentRuntimeBonuses(s).allScrapIncomeMult,
  ));
  const [confirming, setConfirming] = useState(false);

  const cost = getEnhancementCost(item);
  const atCap = item.enhancementLevel >= maxLevel;
  const enhanceReason = atCap ? `At cap Lv.${maxLevel}` : scrapBucks < cost ? `Need $${formatNumber(cost - scrapBucks)} more` : undefined;

  const onSalvage = () => {
    if (needsSalvageConfirm(item) && !confirming) { setConfirming(true); return; }
    setConfirming(false);
    salvage(item.id);
  };

  return (
    <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
      <Button
        variant={isEquipped ? "secondary" : "primary"}
        size="sm"
        onClick={() => (isEquipped ? unequip(item.slot) : equip(item.id))}
        data-testid={`locker-equip-${item.id}`}
      >
        {isEquipped ? "Unequip" : "Equip"}
      </Button>
      <Button size="sm" onClick={() => enhance(item.id)} disabled={Boolean(enhanceReason)} title={enhanceReason ?? "Enhancement always succeeds"}>
        {atCap ? `Lv.${item.enhancementLevel} (cap)` : `Enhance to Lv.${item.enhancementLevel + 1} · $${formatNumber(cost)}`}
      </Button>
      {confirming ? (
        <span className="col-span-2 flex gap-1 sm:col-span-1">
          <Button variant="danger" size="sm" block onClick={onSalvage}>Confirm · +${formatNumber(salvageValue)}</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} aria-label="Cancel salvage">
            <Icon id="close" size={14} />
          </Button>
        </span>
      ) : (
        <Button variant="ghost" size="sm" onClick={onSalvage} title={needsSalvageConfirm(item) ? "Asks to confirm: this piece is Rare or better" : undefined}>
          Salvage · +${formatNumber(salvageValue)}
        </Button>
      )}
      {!atCap && (
        <p className="col-span-2 text-[11px] sm:col-span-3" style={{ color: "var(--text-muted)" }}>
          Enhancing always succeeds and adds +12% to every affix; sockets open at Lv.3 and Lv.7.
        </p>
      )}
    </div>
  );
}

function ModBag({ mods }: { mods: InstalledMod[] }) {
  if (mods.length === 0) return null;
  return (
    <Panel kicker="Spare mods" title={`${mods.length} in the bag`}>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {mods.map((mod) => {
          const template = getModTemplateById(mod.templateId);
          const fits = template?.slots.map((slot) => GEAR_SLOT_LABELS[slot].label).join(", ") ?? "unknown";
          return (
            <li key={mod.id} className="rounded border px-2 py-1.5 text-xs" style={{ borderColor: "var(--panel-border)" }}>
              <div style={{ color: "var(--text-white)" }}>{mod.name}</div>
              <div style={{ color: "var(--text-secondary)" }}>{formatEffect(mod.effectType, mod.value)}</div>
              <div style={{ color: "var(--text-muted)" }}>Fits: {fits}</div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
