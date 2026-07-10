"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/state/store";
import { PART_DEFINITIONS, CONDITIONS, CONDITION_MULTIPLIERS, type PartCondition } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import { CRAFT_RECIPES, canAffordRecipe } from "@/data/craftRecipes";
import { DEALER_UNLOCK_REP } from "@/data/dealer";
import { MATERIAL_DEFINITIONS, type MaterialType } from "@/data/materials";
import { GARAGE_STATIONS, type GarageStationSlot } from "@/data/garageStations";
import { getVehicleById } from "@/data/vehicles";
import { getCircuitById } from "@/data/circuits";
import type { EquipmentAffixArt } from "@/assets/equipmentArt";
import { ATTRIBUTE_LABELS, type StationEquipmentRarity } from "@/data/stationEquipment";
import { STATION_FORGE_COST } from "@/engine/stationForge";
import { REFORGE_COST_SHARDS } from "@/engine/stationReforge";
import { CONDITION_ADDON_SLOTS } from "@/data/parts";
import GameAssetImage from "@/components/GameAssetImage";
import ComposedEquipmentImage from "@/components/ComposedEquipmentImage";
import SkillsSubTab from "@/components/Locker/SkillsSubTab";
import PlaystyleSubTab from "@/components/Upgrades/PlaystyleSubTab";
import WorkshopPanel from "./WorkshopPanel";
import { formatNumber } from "@/utils/format";

type WorkshopTab = "inventory" | "fabrication" | "addons" | "dealer" | "stations" | "philosophy" | "skills" | "facilities";

const TABS: { id: WorkshopTab; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "fabrication", label: "Fabrication" },
  { id: "addons", label: "Add-ons" },
  { id: "dealer", label: "Dealer" },
  { id: "stations", label: "Stations" },
  { id: "philosophy", label: "Philosophy" },
  { id: "skills", label: "Skills" },
  { id: "facilities", label: "Facilities" },
];

const STATION_AFFIXES: Record<GarageStationSlot, EquipmentAffixArt[]> = {
  workbench: ["engineering", "repair"],
  lift: ["repair", "handling"],
  diagnostics: ["engineering", "handling"],
  fabrication: ["engineering", "sourcing"],
  pit_equipment: ["speed", "repair"],
  logistics: ["logistics", "sourcing"],
};

export default function SalvageWorkshopPanel() {
  const [tab, setTab] = useState<WorkshopTab>("inventory");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>Salvage Workshop</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Inspect, improve, source, and equip everything your garage needs.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-lg border p-1" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }} role="tablist" aria-label="Salvage Workshop sections">
        {TABS.map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
            className="shrink-0 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider"
            style={tab === item.id ? { background: "var(--accent)", color: "var(--btn-primary-text)" } : { color: "var(--text-secondary)" }}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "inventory" && <InventoryWorkbench />}
      {tab === "fabrication" && <FabricationBench />}
      {tab === "addons" && <AddonBench />}
      {tab === "dealer" && <DealerBoard />}
      {tab === "stations" && <StationEquipment />}
      {tab === "philosophy" && <Philosophy />}
      {tab === "skills" && <SkillsSubTab />}
      {tab === "facilities" && <WorkshopPanel />}
    </div>
  );
}

function MaterialsBar() {
  const materials = useGameStore((s) => s.materials);
  const forgeTokens = useGameStore((s) => s.forgeTokens);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {MATERIAL_DEFINITIONS.map((material) => <Metric key={material.id} label={material.name} value={materials[material.id]} />)}
      <Metric label="Forge Tokens" value={forgeTokens} />
    </div>
  );
}

function InventoryWorkbench() {
  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const selectedCircuitId = useGameStore((s) => s.selectedCircuitId);
  const sellPart = useGameStore((s) => s.sellPart);
  const decomposePart = useGameStore((s) => s.decomposePart);
  const enhancePart = useGameStore((s) => s.enhancePart);
  const forgePart = useGameStore((s) => s.forgePart);
  const tradeUpParts = useGameStore((s) => s.tradeUpParts);
  const active = garage.find((vehicle) => vehicle.id === activeVehicleId);
  const selectedCircuit = getCircuitById(selectedCircuitId);
  const parts = inventory.filter((part) => part.type !== "addon");
  const tradeGroup = useMemo(() => {
    const groups = new Map<string, typeof parts>();
    for (const part of parts) {
      const def = PART_DEFINITIONS.find((item) => item.id === part.definitionId);
      if (!def || CONDITIONS.indexOf(part.condition as PartCondition) >= 5) continue;
      const key = `${def.category}:${part.condition}`;
      groups.set(key, [...(groups.get(key) ?? []), part]);
    }
    return [...groups.values()].find((items) => items.length >= 3);
  }, [parts]);

  return (
    <div className="flex flex-col gap-4">
      <MaterialsBar />
      {parts.length === 0 ? <Empty text="No parts yet. Scavenge first, then return here to engineer them." /> : (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {parts.map((part) => {
            const def = PART_DEFINITIONS.find((item) => item.id === part.definitionId);
            if (!def) return null;
            const installedSlot = active?.parts[def.category];
            const installed = installedSlot?.part;
            const installedDefinition = installed ? PART_DEFINITIONS.find((item) => item.id === installed.definitionId) : undefined;
            const multiplier = CONDITION_MULTIPLIERS[part.condition as PartCondition] ?? 1;
            const installedMultiplier = installed ? CONDITION_MULTIPLIERS[installed.condition as PartCondition] ?? 1 : 1;
            const deltas = installedDefinition ? {
              speed: def.basePower * multiplier - installedDefinition.basePower * installedMultiplier,
              handling: def.basePower * 0.2 * multiplier - installedDefinition.basePower * 0.2 * installedMultiplier,
              reliability: def.baseReliability * multiplier - installedDefinition.baseReliability * installedMultiplier,
              weight: def.baseWeight - installedDefinition.baseWeight,
            } : null;
            const compatibleVehicles = active ? (getVehicleById(active.definitionId)?.slots.some((slot) => slot.acceptableParts.includes(def.id)) ?? false) : false;
            const conditionIndex = CONDITIONS.indexOf(part.condition as PartCondition);
            return (
              <article key={part.id} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
                <div className="flex gap-3">
                  <GameAssetImage kind="part" id={part.definitionId} width={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><strong style={{ color: "var(--text-white)" }}>{def.name}</strong><span className="text-xs uppercase" style={{ color: "var(--accent)" }}>{part.condition}</span></div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{def.category} · Speed contribution {Math.round(def.basePower * multiplier)} · Handling {Math.round(def.basePower * 0.2 * multiplier)} · Reliability {Math.round(def.baseReliability * multiplier)} · {def.baseWeight}kg</p>
                    <p className="mt-1 text-xs" style={{ color: compatibleVehicles ? "var(--success)" : "var(--warning)" }}>{active ? `${compatibleVehicles ? "Compatible" : "Not compatible"} with the focus vehicle` : "Select a focus vehicle to check compatibility"} · {selectedCircuit ? `${selectedCircuit.name} T${selectedCircuit.tier} demand` : "No circuit selected"}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {deltas ? `Vs installed: speed ${signed(deltas.speed)}, handling ${signed(deltas.handling)}, reliability ${signed(deltas.reliability)}, weight ${signed(deltas.weight)}kg` : "No matching installed part to compare"}
                    </p>
                    {installedSlot && installedSlot.addons.length > 0 && <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Installed add-ons: {installedSlot.addons.map((addon) => getAddonById(addon.definitionId)?.name ?? addon.definitionId).join(", ")}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Action onClick={() => sellPart(part.id)}>Sell ${def.scrapValue}</Action>
                  <Action onClick={() => decomposePart(part.id)}>Decompose</Action>
                  {conditionIndex < 7 && <Action disabled={(workshopLevels.tuning_bench ?? 0) < 1} onClick={() => enhancePart(part.id)}>Enhance</Action>}
                  {part.condition === "mythic" && <Action disabled={(workshopLevels.artifact_forge ?? 0) < 1} onClick={() => forgePart(part.id)}>Forge</Action>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <strong style={{ color: "var(--text-white)" }}>Trade-up</strong>
        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>Convert three same-category, same-condition parts into one part at the next condition.</p>
        <Action disabled={!tradeGroup || (workshopLevels.parts_trader ?? 0) < 1} onClick={() => tradeGroup && tradeUpParts(tradeGroup.slice(0, 3).map((part) => part.id) as [string, string, string])}>Trade best eligible trio</Action>
      </div>
    </div>
  );
}

function FabricationBench() {
  const materials = useGameStore((s) => s.materials);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const craftPart = useGameStore((s) => s.craftPart);
  const convert = useGameStore((s) => s.convertScrapToMaterial);
  return <div className="flex flex-col gap-4"><MaterialsBar />
    {(workshopLevels.parts_bin ?? 0) < 1 && <Notice text="Unlock Parts Bin in Facilities to use targeted fabrication." />}
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{CRAFT_RECIPES.map((recipe) => (
      <article key={`${recipe.category}:${recipe.resultCondition}`} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <strong style={{ color: "var(--text-white)" }}>{recipe.label}</strong><p className="text-xs" style={{ color: "var(--text-muted)" }}>{recipe.description}</p>
        <p className="my-2 text-xs" style={{ color: "var(--text-secondary)" }}>{Object.entries(recipe.cost).map(([id, amount]) => `${amount} ${MATERIAL_DEFINITIONS.find((m) => m.id === id)?.name ?? id}`).join(" · ")}</p>
        <Action disabled={(workshopLevels.parts_bin ?? 0) < 1 || !canAffordRecipe(recipe, materials)} onClick={() => craftPart(recipe)}>Craft</Action>
      </article>
    ))}</div>
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><strong style={{ color: "var(--text-white)" }}>Material sourcing</strong><div className="mt-2 flex flex-wrap gap-2">{(["metalScrap", "rubberCompound", "greaseSludge"] as MaterialType[]).map((id) => <Action key={id} onClick={() => convert(id)}>$200 → 5 {MATERIAL_DEFINITIONS.find((m) => m.id === id)?.name}</Action>)}</div></div>
  </div>;
}

function AddonBench() {
  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const install = useGameStore((s) => s.installAddon);
  const remove = useGameStore((s) => s.removeAddon);
  const active = garage.find((vehicle) => vehicle.id === activeVehicleId);
  if (!active) return <Empty text="Build and select a focus vehicle before managing add-ons." />;
  const vehicle = getVehicleById(active.definitionId);
  return <div className="flex flex-col gap-3">
    {(workshopLevels.addon_bench ?? 0) < 1 && <Notice text="Unlock Add-on Bench in Facilities to install add-ons." />}
    {vehicle?.slots.map((slot) => {
      const installed = active.parts[slot.slot]; if (!installed) return null;
      const compatible = inventory.filter((item) => item.type === "addon" && getAddonById(item.definitionId)?.targetSlot === slot.slot);
      const capacity = CONDITION_ADDON_SLOTS[installed.part.condition as PartCondition] ?? 0;
      return <article key={slot.slot} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <div className="flex justify-between"><strong className="capitalize" style={{ color: "var(--text-white)" }}>{slot.slot}</strong><span className="text-xs" style={{ color: "var(--text-muted)" }}>{installed.addons.length}/{capacity} installed</span></div>
        <div className="mt-2 flex flex-wrap gap-2">{installed.addons.map((addon) => <Action key={addon.id} onClick={() => remove(active.id, slot.slot, addon.id)}>Remove {getAddonById(addon.definitionId)?.name}</Action>)}{compatible.map((addon) => <Action key={addon.id} disabled={(workshopLevels.addon_bench ?? 0) < 1 || installed.addons.length >= capacity} onClick={() => install(active.id, slot.slot, addon.id)}>Install {getAddonById(addon.definitionId)?.name}</Action>)}</div>
      </article>;
    })}
  </div>;
}

function DealerBoard() {
  const rep = useGameStore((s) => s.repPoints); const cash = useGameStore((s) => s.scrapBucks); const board = useGameStore((s) => s.dealerBoard);
  const buy = useGameStore((s) => s.buyFromDealer); const refresh = useGameStore((s) => s.refreshDealer);
  if (rep < DEALER_UNLOCK_REP) return <Empty text={`Dealer sourcing unlocks at ${formatNumber(DEALER_UNLOCK_REP)} reputation.`} />;
  return <div className="flex flex-col gap-3"><div className="flex items-center justify-between"><p className="text-xs" style={{ color: "var(--text-muted)" }}>A bounded alternative when scavenging will not provide a required part.</p><Action disabled={cash < 300} onClick={refresh}>Refresh $300</Action></div>
    {board.length === 0 ? <Empty text="No listings remain. Refresh the board to source new stock." /> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{board.map((listing) => { const part = PART_DEFINITIONS.find((item) => item.id === listing.definitionId); return <article key={listing.id} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><GameAssetImage kind="part" id={listing.definitionId} width={64} /><strong className="block" style={{ color: "var(--text-white)" }}>{part?.name}</strong><p className="mb-2 text-xs uppercase" style={{ color: "var(--accent)" }}>{listing.condition}</p><Action disabled={cash < listing.price} onClick={() => buy(listing.id)}>Buy ${formatNumber(listing.price)}</Action></article>; })}</div>}
  </div>;
}

function StationEquipment() {
  const cash = useGameStore((s) => s.scrapBucks); const shards = useGameStore((s) => s.reforgeShards);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const inventory = useGameStore((s) => s.stationEquipmentInventory); const equipped = useGameStore((s) => s.equippedStationEquipment);
  const forge = useGameStore((s) => s.forgeStationItem); const equip = useGameStore((s) => s.equipStationItem);
  const reforge = useGameStore((s) => s.reforgeStationItem); const enhance = useGameStore((s) => s.enhanceStationItem); const salvage = useGameStore((s) => s.salvageStationItem);
  return <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{GARAGE_STATIONS.map((station) => {
    const options = inventory.filter((item) => item.slot === station.id); const current = options.find((item) => item.id === equipped[station.id]); const rarity = current?.rarity ?? "common";
    return <article key={station.id} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><div className="flex gap-3"><ComposedEquipmentImage variant={{ slot: station.id, rarity, set: current?.setId, affixes: STATION_AFFIXES[station.id] }} size={64} /><div><strong style={{ color: "var(--text-white)" }}>{station.name}</strong><p className="text-xs" style={{ color: "var(--text-muted)" }}>{station.description}</p><p className="mt-1 text-xs" style={{ color: "var(--accent)" }}>{current ? `${current.name} +${current.enhancementLevel}` : "No equipment installed"}</p></div></div>
      {current && <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>{current.effects.map((effect) => effect.type === "attribute" ? `+${effect.value} ${ATTRIBUTE_LABELS[effect.attribute]}` : `+${Math.round(effect.value * 100)}% ${effect.bonus}`).join(" · ")}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{(["common", "rare"] as StationEquipmentRarity[]).map((forgeRarity) => <Action key={forgeRarity} disabled={cash < STATION_FORGE_COST[forgeRarity]} onClick={() => forge(station.id, forgeRarity)}>Forge {forgeRarity} ${formatNumber(STATION_FORGE_COST[forgeRarity])}</Action>)}{options.map((item) => <span key={item.id} className="inline-flex flex-wrap gap-1"><Action onClick={() => equip(item.id)}>{item.name}</Action><Action disabled={item.enhancementLevel >= Math.min(13, 4 + (workshopLevels.enhancement_mastery ?? 0) * 3)} onClick={() => enhance(item.id)}>Enhance +{item.enhancementLevel}</Action><Action disabled={(workshopLevels.careful_modding ?? 0) < 1 || shards < REFORGE_COST_SHARDS[item.rarity]} onClick={() => reforge(item.id)}>Reforge {REFORGE_COST_SHARDS[item.rarity]}</Action><Action disabled={equipped[station.id] === item.id} onClick={() => salvage(item.id)}>Salvage</Action></span>)}</div>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Reforge shards: {shards}</p></article>;
  })}</div>;
}

function Philosophy() { return <div className="flex flex-col gap-3"><Notice text="Talents and playstyles now share one LP-funded Garage Philosophy: Scrapper, Racer, and Engineer." /><PlaystyleSubTab /></div>; }

function Action({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) { return <button disabled={disabled} onClick={onClick} className="rounded border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}>{children}</button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div><div className="font-mono text-sm" style={{ color: "var(--text-white)" }}>{formatNumber(value)}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--text-muted)" }}>{text}</div>; }
function Notice({ text }: { text: string }) { return <div className="rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)", color: "var(--text-secondary)" }}>{text}</div>; }
function signed(value: number): string { const rounded = Math.round(value * 10) / 10; return `${rounded > 0 ? "+" : ""}${rounded}`; }
