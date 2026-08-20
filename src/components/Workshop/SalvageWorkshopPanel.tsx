"use client";

import { memo, useMemo, useState } from "react";
import {
  getDealerPurchasePrice,
  getDealerRefreshCost,
  getMaterialSourcingTerms,
  getReducedCraftCost,
  getReducedEnhancementCost,
  getSellValueBonus,
  useGameStore,
} from "@/state/store";
import { PART_DEFINITIONS, CONDITIONS, CONDITION_MULTIPLIERS, type PartCondition } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import { CRAFT_RECIPES } from "@/data/craftRecipes";
import { DEALER_UNLOCK_REP } from "@/data/dealer";
import { MATERIAL_DEFINITIONS, type MaterialType } from "@/data/materials";
import { GARAGE_STATIONS, type GarageStationSlot } from "@/data/garageStations";
import { getVehicleById } from "@/data/vehicles";
import { getCircuitById } from "@/data/circuits";
import type { EquipmentAffixArt } from "@/assets/equipmentArt";
import { ATTRIBUTE_LABELS, STATION_SETS, type StationEquipmentEffect, type StationEquipmentRarity } from "@/data/stationEquipment";
import { STATION_FORGE_COST } from "@/engine/stationForge";
import { getEnhancedStationEquipmentEffects, getMaxStationEnhancementLevel, getStationEnhancementCost } from "@/engine/stationEquipment";
import { canReforgeStationEquipment, getStationSalvageYield, REFORGE_COST_SHARDS } from "@/engine/stationReforge";
import { CONDITION_ADDON_SLOTS } from "@/data/parts";
import GameAssetImage from "@/components/GameAssetImage";
import ComposedEquipmentImage from "@/components/ComposedEquipmentImage";
import SkillsSubTab from "@/components/Locker/SkillsSubTab";
import PlaystyleSubTab from "@/components/Upgrades/PlaystyleSubTab";
import WorkshopPanel from "./WorkshopPanel";
import MobileSubNav from "@/components/MobileSubNav";
import { formatNumber } from "@/utils/format";
import { getPartSaleValue } from "@/engine/sale";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";
import {
  ARTIFACT_FORGE_COST,
  ARTIFACT_FORGE_TOKEN_COST,
  calculateEnhancementCost,
  canAffordEnhancement,
  type EnhancementCost,
} from "@/data/enhancement";
import {
  BULK_DECOMPOSE_COST,
  FATIGUE_DRINK_COST,
  FATIGUE_DRINK_PROGRESS_KEY,
  FATIGUE_DRINK_RECOVERY,
  FATIGUE_DRINK_RUN_LIMIT,
} from "@/data/workshopActions";

type WorkshopTab = "inventory" | "fabrication" | "addons" | "dealer" | "stations" | "philosophy" | "skills" | "facilities";

interface SalvageWorkshopPanelProps {
  initialTab?: WorkshopTab;
}

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

const INVENTORY_PAGE_SIZE = 40;

const STATION_AFFIXES: Record<GarageStationSlot, EquipmentAffixArt[]> = {
  workbench: ["engineering", "repair"],
  lift: ["repair", "handling"],
  diagnostics: ["engineering", "handling"],
  fabrication: ["engineering", "sourcing"],
  pit_equipment: ["speed", "repair"],
  logistics: ["logistics", "sourcing"],
};

const STATION_RARITIES: StationEquipmentRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

const STATION_BONUS_LABELS: Record<Extract<StationEquipmentEffect, { type: "bonus" }>["bonus"], string> = {
  scavenge_luck_bonus: "scavenge luck",
  scavenge_yield_pct: "scavenge yield",
  sell_value_bonus_pct: "sale value",
  race_performance_pct: "race performance",
  race_dnf_reduction: "DNF chance",
  race_handling_pct: "race handling",
  race_wear_reduction_pct: "race wear",
  race_scrap_bonus_pct: "race Scrap",
  build_cost_reduction_pct: "build cost",
  repair_cost_reduction_pct: "repair cost",
  refurb_cost_reduction_pct: "refurbish cost",
  tick_speed_reduction_ms: "tick interval",
  fatigue_rate_reduction: "fatigue gain",
  material_bonus_pct: "material yield",
  forge_token_chance_bonus: "Forge Token chance",
};

const STATION_REDUCTION_BONUSES = new Set<Extract<StationEquipmentEffect, { type: "bonus" }>["bonus"]>([
  "race_dnf_reduction",
  "race_wear_reduction_pct",
  "build_cost_reduction_pct",
  "repair_cost_reduction_pct",
  "refurb_cost_reduction_pct",
  "tick_speed_reduction_ms",
  "fatigue_rate_reduction",
]);

export default function SalvageWorkshopPanel({ initialTab = "inventory" }: SalvageWorkshopPanelProps) {
  const [tab, setTab] = useState<WorkshopTab>(initialTab);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>Salvage Workshop</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Inspect, improve, source, and equip everything your garage needs.</p>
      </div>
      <MobileSubNav tabs={TABS} activeTab={tab} setActiveTab={(id) => setTab(id as WorkshopTab)} tutorialTargetId="workshop-facilities-tab" />
      <div className="hidden gap-1 overflow-x-auto rounded-lg border p-1 sm:flex" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }} role="tablist" aria-label="Salvage Workshop sections">
        {TABS.map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
            data-tutorial={item.id === "facilities" ? "workshop-facilities-tab" : undefined}
            className="shrink-0 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider"
            style={tab === item.id ? { background: "var(--accent)", color: "var(--btn-primary-text)" } : { color: "var(--text-secondary)" }}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "inventory" && <InventoryWorkbench />}
      {tab === "fabrication" && <FabricationBench />}
      {tab === "addons" && <AddonBench onOpenFacilities={() => setTab("facilities")} />}
      {tab === "dealer" && <DealerBoard onOpenFacilities={() => setTab("facilities")} />}
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
  const gameState = useGameStore.getState();
  const [inventoryPage, setInventoryPage] = useState(0);
  const inventory = useGameStore((s) => s.inventory);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const materials = useGameStore((s) => s.materials);
  const forgeTokens = useGameStore((s) => s.forgeTokens);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const fatigue = useGameStore((s) => s.fatigue);
  const challengeProgress = useGameStore((s) => s.challengeProgress);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const selectedCircuitId = useGameStore((s) => s.selectedCircuitId);
  const sellPart = useGameStore((s) => s.sellPart);
  const sellValueBonus = useGameStore(getSellValueBonus);
  const decomposePart = useGameStore((s) => s.decomposePart);
  const decomposeAllJunk = useGameStore((s) => s.decomposeAllJunk);
  const purchaseFatigueDrink = useGameStore((s) => s.purchaseFatigueDrink);
  const enhancePart = useGameStore((s) => s.enhancePart);
  const forgePart = useGameStore((s) => s.forgePart);
  const tradeUpParts = useGameStore((s) => s.tradeUpParts);
  const active = garage.find((vehicle) => vehicle.id === activeVehicleId);
  const selectedCircuit = getCircuitById(selectedCircuitId);
  const parts = useMemo(
    () => inventory.filter((part) => part.type !== "addon"),
    [inventory],
  );
  const inventoryPageCount = Math.max(1, Math.ceil(parts.length / INVENTORY_PAGE_SIZE));
  const visibleInventoryPage = Math.min(inventoryPage, inventoryPageCount - 1);
  const visibleParts = useMemo(
    () => parts.slice(
      visibleInventoryPage * INVENTORY_PAGE_SIZE,
      (visibleInventoryPage + 1) * INVENTORY_PAGE_SIZE,
    ),
    [parts, visibleInventoryPage],
  );
  const bulkDecomposeCount = inventory.filter(
    (part) => part.condition === "rusted" || part.condition === "worn",
  ).length;
  const bulkDecomposeIsFree = getPrestigeMilestoneBonuses(prestigeCount).freeDecomposeAll;
  const bulkDecomposeCost = bulkDecomposeIsFree ? 0 : BULK_DECOMPOSE_COST;
  const canBulkDecompose = bulkDecomposeCount > 0 && scrapBucks >= bulkDecomposeCost;
  const fatigueDrinksPurchased = challengeProgress[FATIGUE_DRINK_PROGRESS_KEY] ?? 0;
  const fatigueDrinksRemaining = Math.max(0, FATIGUE_DRINK_RUN_LIMIT - fatigueDrinksPurchased);
  const canPurchaseFatigueDrink =
    fatigue > 0 &&
    fatigueDrinksRemaining > 0 &&
    scrapBucks >= FATIGUE_DRINK_COST;
  const tradeGroup = useMemo(() => {
    const groups = new Map<string, typeof parts>();
    for (const part of parts) {
      const def = PART_DEFINITIONS.find((item) => item.id === part.definitionId);
      if (!def || CONDITIONS.indexOf(part.condition as PartCondition) >= 5) continue;
      const key = `${def.category}:${part.condition}`;
      groups.set(key, [...(groups.get(key) ?? []), part]);
    }
    return [...groups.values()]
      .filter((items) => items.length >= 3)
      .map((items) => [...items].sort((left, right) => partModelScore(right.definitionId) - partModelScore(left.definitionId)))
      .sort((left, right) =>
        CONDITIONS.indexOf(right[0].condition as PartCondition) - CONDITIONS.indexOf(left[0].condition as PartCondition)
        || partModelScore(right[0].definitionId) - partModelScore(left[0].definitionId),
      )[0];
  }, [parts]);

  return (
    <div className="flex flex-col gap-4">
      <MaterialsBar />
      {parts.length === 0 ? <Empty text="No parts yet. Scavenge first, then return here to engineer them." /> : (
        <>
        <InventoryPager
          page={visibleInventoryPage}
          pageCount={inventoryPageCount}
          total={parts.length}
          onPageChange={setInventoryPage}
        />
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {visibleParts.map((part) => {
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
            const enhancementBaseCost = conditionIndex >= 1 && conditionIndex < 7
              ? calculateEnhancementCost(conditionIndex + 1, def.category, fatigue)
              : null;
            const enhancementCost = enhancementBaseCost
              ? getReducedEnhancementCost(gameState, enhancementBaseCost)
              : null;
            const enhancementReason = (workshopLevels.tuning_bench ?? 0) < 1
              ? "Requires Tuning Bench"
              : conditionIndex === 0
                ? "Rusted parts cannot be enhanced; decompose them for materials"
                : !enhancementCost
                  ? "This condition cannot use regular enhancement"
                  : !canAffordEnhancement(enhancementCost, materials)
                    ? `Missing ${formatMaterialShortfall(enhancementCost, materials)}`
                    : undefined;
            const forgeMaterialCost = getReducedEnhancementCost(gameState, ARTIFACT_FORGE_COST);
            const forgeReason = (workshopLevels.artifact_forge ?? 0) < 1
              ? "Requires Artifact Forge"
              : forgeTokens < ARTIFACT_FORGE_TOKEN_COST
                ? `Need ${ARTIFACT_FORGE_TOKEN_COST} Forge Token`
                : !canAffordEnhancement(forgeMaterialCost, materials)
                  ? `Missing ${formatMaterialShortfall(forgeMaterialCost, materials)}`
                  : undefined;
            return (
              <article data-testid="workshop-inventory-item" key={part.id} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
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
                  <Action onClick={() => sellPart(part.id)}>Sell ${getPartSaleValue(part, sellValueBonus)}</Action>
                  <Action onClick={() => decomposePart(part.id)}>Decompose</Action>
                  {conditionIndex < 7 && (
                    <Action disabledReason={enhancementReason} onClick={() => enhancePart(part.id)}>
                      Enhance{enhancementCost ? ` · ${formatMaterialCost(enhancementCost)}` : ""}
                    </Action>
                  )}
                  {part.condition === "mythic" && (
                    <Action disabledReason={forgeReason} onClick={() => forgePart(part.id)}>
                      Forge · {ARTIFACT_FORGE_TOKEN_COST} Token + {formatMaterialCost(forgeMaterialCost)}
                    </Action>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <InventoryPager
          page={visibleInventoryPage}
          pageCount={inventoryPageCount}
          total={parts.length}
          onPageChange={setInventoryPage}
        />
        </>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
          <strong style={{ color: "var(--text-white)" }}>Bulk breakdown</strong>
          <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Decompose every rusted and worn item into materials at once.
          </p>
          <Action disabled={!canBulkDecompose} onClick={decomposeAllJunk}>
            Decompose {bulkDecomposeCount} item{bulkDecomposeCount === 1 ? "" : "s"} — {bulkDecomposeIsFree ? "Free" : `$${BULK_DECOMPOSE_COST}`}
          </Action>
          <p className="mt-2 text-xs" style={{ color: canBulkDecompose ? "var(--success)" : "var(--warning)" }}>
            {bulkDecomposeCount === 0
              ? "No rusted or worn items are available."
              : scrapBucks < bulkDecomposeCost
                ? `Need $${bulkDecomposeCost}; you have $${formatNumber(scrapBucks)}.`
                : bulkDecomposeIsFree
                  ? "Bulk Scrapper makes this action free."
                  : `This action costs $${bulkDecomposeCost}.`}
          </p>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
          <strong style={{ color: "var(--text-white)" }}>Pit recovery</strong>
          <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Fatigue {fatigue}/99 · {fatigueDrinksRemaining}/{FATIGUE_DRINK_RUN_LIMIT} drinks remaining this run.
          </p>
          <Action disabled={!canPurchaseFatigueDrink} onClick={purchaseFatigueDrink}>
            Fatigue Drink — ${FATIGUE_DRINK_COST}
          </Action>
          <p className="mt-2 text-xs" style={{ color: canPurchaseFatigueDrink ? "var(--success)" : "var(--warning)" }}>
            {fatigue <= 0
              ? "No fatigue to recover."
              : fatigueDrinksRemaining === 0
                ? `Run limit reached (${FATIGUE_DRINK_RUN_LIMIT}/${FATIGUE_DRINK_RUN_LIMIT}).`
                : scrapBucks < FATIGUE_DRINK_COST
                  ? `Need $${FATIGUE_DRINK_COST}; you have $${formatNumber(scrapBucks)}.`
                  : `Recover ${Math.min(FATIGUE_DRINK_RECOVERY, fatigue)} fatigue.`}
          </p>
        </div>
      </div>
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <strong style={{ color: "var(--text-white)" }}>Trade-up</strong>
        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>Convert three same-category, same-condition parts into the strongest model from the trio at the next condition.</p>
        <Action disabled={!tradeGroup || (workshopLevels.parts_trader ?? 0) < 1} onClick={() => tradeGroup && tradeUpParts(tradeGroup.slice(0, 3).map((part) => part.id) as [string, string, string])}>Trade best eligible trio</Action>
      </div>
    </div>
  );
}

function FabricationBench() {
  const gameState = useGameStore.getState();
  const materials = useGameStore((s) => s.materials);
  const cash = useGameStore((s) => s.scrapBucks);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const craftPart = useGameStore((s) => s.craftPart);
  const convert = useGameStore((s) => s.convertScrapToMaterial);
  const sourceableMaterials = MATERIAL_DEFINITIONS.filter(
    (material) => getMaterialSourcingTerms(gameState, material.id).available,
  );
  return <div className="flex flex-col gap-4"><MaterialsBar />
    {(workshopLevels.parts_bin ?? 0) < 1 && <Notice text="Unlock Parts Bin in Facilities to use targeted fabrication." />}
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{CRAFT_RECIPES.map((recipe) => {
      const cost = getReducedCraftCost(gameState, recipe.cost);
      const canAfford = Object.entries(cost).every(([material, amount]) => materials[material as MaterialType] >= (amount ?? 0));
      return <article key={`${recipe.category}:${recipe.resultCondition}`} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <strong style={{ color: "var(--text-white)" }}>{recipe.label}</strong><p className="text-xs" style={{ color: "var(--text-muted)" }}>{recipe.description}</p>
        <p className="my-2 text-xs" style={{ color: "var(--text-secondary)" }}>{Object.entries(cost).map(([id, amount]) => `${amount} ${MATERIAL_DEFINITIONS.find((m) => m.id === id)?.name ?? id}`).join(" · ")}</p>
        <Action disabled={(workshopLevels.parts_bin ?? 0) < 1 || !canAfford} onClick={() => craftPart(recipe)}>Craft</Action>
      </article>;
    })}</div>
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><strong style={{ color: "var(--text-white)" }}>Material sourcing</strong><div className="mt-2 flex flex-wrap gap-2">{sourceableMaterials.map((material) => {
      const terms = getMaterialSourcingTerms(gameState, material.id);
      return <Action key={material.id} disabledReason={cash < terms.cost ? `Need $${formatNumber(terms.cost - cash)} more` : undefined} onClick={() => convert(material.id)}>${terms.cost} → {terms.yield} {material.name}</Action>;
    })}</div></div>
  </div>;
}

function AddonBench({ onOpenFacilities }: { onOpenFacilities: () => void }) {
  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const isRacing = useGameStore((s) => s.isRacing);
  const fleetAssignments = useGameStore((s) => s.fleetAssignments);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const install = useGameStore((s) => s.installAddon);
  const remove = useGameStore((s) => s.removeAddon);
  const active = garage.find((vehicle) => vehicle.id === activeVehicleId);
  if (!active) return <Empty text="Build and select a focus vehicle before managing add-ons." />;
  const vehicle = getVehicleById(active.definitionId);
  const fleetStatus = fleetAssignments.find((assignment) => assignment.vehicleId === active.id)?.status;
  const mutationLockReason = fleetStatus === "running"
    ? "Vehicle is running a Fleet Program"
    : fleetStatus === "complete"
      ? "Collect this vehicle's Fleet rewards first"
      : isRacing
        ? "Vehicle is currently racing"
        : undefined;
  return <div className="flex flex-col gap-3">
    {(workshopLevels.addon_bench ?? 0) < 1 && <LockedAction text="Unlock Add-on Bench in Facilities to install add-ons." action="Open Facilities" onClick={onOpenFacilities} />}
    {mutationLockReason && <Notice text={`${mutationLockReason}. Add-on changes are locked until it returns.`} />}
    {vehicle?.slots.map((slot) => {
      const installed = active.parts[slot.slot]; if (!installed) return null;
      const compatible = inventory.filter((item) => item.type === "addon" && getAddonById(item.definitionId)?.targetSlot === slot.slot);
      const capacity = CONDITION_ADDON_SLOTS[installed.part.condition as PartCondition] ?? 0;
      return <article key={slot.slot} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <div className="flex justify-between"><strong className="capitalize" style={{ color: "var(--text-white)" }}>{slot.slot}</strong><span className="text-xs" style={{ color: "var(--text-muted)" }}>{installed.addons.length}/{capacity} installed</span></div>
        <div className="mt-2 flex flex-wrap gap-2">{installed.addons.map((addon) => <Action key={addon.id} disabledReason={mutationLockReason} onClick={() => remove(active.id, slot.slot, addon.id)}>Remove {getAddonById(addon.definitionId)?.name}</Action>)}{compatible.map((addon) => {
          const disabledReason = mutationLockReason
            ?? ((workshopLevels.addon_bench ?? 0) < 1 ? "Requires Add-on Bench" : undefined)
            ?? (installed.addons.length >= capacity ? `No free add-on slot (${installed.addons.length}/${capacity})` : undefined);
          return <Action key={addon.id} disabledReason={disabledReason} onClick={() => install(active.id, slot.slot, addon.id)}>Install {getAddonById(addon.definitionId)?.name}</Action>;
        })}</div>
      </article>;
    })}
  </div>;
}

function DealerBoard({ onOpenFacilities }: { onOpenFacilities: () => void }) {
  const gameState = useGameStore.getState();
  const rep = useGameStore((s) => s.repPoints); const cash = useGameStore((s) => s.scrapBucks); const board = useGameStore((s) => s.dealerBoard);
  const buy = useGameStore((s) => s.buyFromDealer); const refresh = useGameStore((s) => s.refreshDealer);
  const refreshCost = getDealerRefreshCost(gameState);
  if (rep < DEALER_UNLOCK_REP) return <LockedAction text={`Dealer sourcing unlocks at ${formatNumber(DEALER_UNLOCK_REP)} reputation. Upgrade sourcing facilities while you build Rep.`} action="Open Facilities" onClick={onOpenFacilities} />;
  return <div className="flex flex-col gap-3"><div className="flex items-center justify-between"><p className="text-xs" style={{ color: "var(--text-muted)" }}>A bounded alternative when scavenging will not provide a required part.</p><Action disabledReason={cash < refreshCost ? `Need $${formatNumber(refreshCost - cash)} more` : undefined} onClick={refresh}>Refresh ${formatNumber(refreshCost)}</Action></div>
    {board.length === 0 ? <Empty text="No listings remain. Refresh the board to source new stock." /> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{board.map((listing) => { const part = PART_DEFINITIONS.find((item) => item.id === listing.definitionId); const price = getDealerPurchasePrice(gameState, listing); return <article key={listing.id} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><GameAssetImage kind="part" id={listing.definitionId} width={64} /><strong className="block" style={{ color: "var(--text-white)" }}>{part?.name}</strong><p className="mb-2 text-xs uppercase" style={{ color: "var(--accent)" }}>{listing.condition}</p><Action disabledReason={cash < price ? `Need $${formatNumber(price - cash)} more` : undefined} onClick={() => buy(listing.id)}>Buy ${formatNumber(price)}</Action></article>; })}</div>}
  </div>;
}

function StationEquipment() {
  const cash = useGameStore((s) => s.scrapBucks); const shards = useGameStore((s) => s.reforgeShards);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const inventory = useGameStore((s) => s.stationEquipmentInventory); const equipped = useGameStore((s) => s.equippedStationEquipment);
  const forge = useGameStore((s) => s.forgeStationItem); const equip = useGameStore((s) => s.equipStationItem); const unequip = useGameStore((s) => s.unequipStationItem);
  const reforge = useGameStore((s) => s.reforgeStationItem); const enhance = useGameStore((s) => s.enhanceStationItem); const salvage = useGameStore((s) => s.salvageStationItem);
  const enhancementCap = getMaxStationEnhancementLevel(workshopLevels.enhancement_mastery ?? 0);
  const equippedItems = GARAGE_STATIONS.flatMap((station) => {
    const item = inventory.find((candidate) => candidate.id === equipped[station.id]);
    return item ? [item] : [];
  });
  const setCounts = new Map(STATION_SETS.map((set) => [set.id, equippedItems.filter((item) => item.setId === set.id).length]));

  return <div className="flex flex-col gap-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="Scrap Bucks" value={cash} />
      <Metric label="Reforge Shards" value={shards} />
      <Metric label="Installed Stations" value={equippedItems.length} />
      <Metric label="Enhancement Cap" value={enhancementCap} />
    </div>
    <Notice text="Enhancement increases an item's own effects by 12% per level. Set bonuses activate from installed matching pieces and are not multiplied by enhancement." />
    <section className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-heading)" }}>Station Sets</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-2">{STATION_SETS.map((set) => {
        const count = setCounts.get(set.id) ?? 0;
        return <article key={set.id} className="rounded border p-2" style={{ borderColor: count >= 2 ? "var(--accent-border)" : "var(--panel-border)" }}>
          <div className="flex items-center justify-between gap-2"><strong className="text-xs" style={{ color: "var(--text-white)" }}>{set.name}</strong><span className="font-mono text-xs" style={{ color: count >= 2 ? "var(--accent)" : "var(--text-muted)" }}>{count}/{set.slots.length} installed</span></div>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>Pieces: {set.slots.map(stationName).join(", ")}</p>
          <div className="mt-1 space-y-0.5">{set.tiers.map((tier) => {
            const active = count >= tier.piecesRequired;
            return <p key={tier.piecesRequired} className="text-xs" style={{ color: active ? "var(--success)" : "var(--text-dim)" }}>{active ? "Active" : `${tier.piecesRequired - count} more`}: {tier.piecesRequired}-piece · {tier.description}</p>;
          })}</div>
        </article>;
      })}</div>
    </section>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{GARAGE_STATIONS.map((station) => {
      const options = inventory.filter((item) => item.slot === station.id);
      const current = options.find((item) => item.id === equipped[station.id]);
      const rarity = current?.rarity ?? "common";
      return <section key={station.id} className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <div className="flex gap-3"><ComposedEquipmentImage variant={{ slot: station.id, rarity, set: current?.setId, affixes: STATION_AFFIXES[station.id] }} size={64} /><div><h3 className="text-sm font-semibold" style={{ color: "var(--text-white)" }}>{station.name}</h3><p className="text-xs" style={{ color: "var(--text-muted)" }}>{station.description}</p><p className="mt-1 text-xs" style={{ color: "var(--accent)" }}>{current ? `Installed: ${current.name} +${current.enhancementLevel}` : "No equipment installed"}</p></div></div>
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>Forge new equipment</p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">{STATION_RARITIES.map((forgeRarity) => {
            const cost = STATION_FORGE_COST[forgeRarity];
            const reason = cash < cost ? `Need $${formatNumber(cost - cash)} more` : undefined;
            return <StationAction key={forgeRarity} label={`Forge ${capitalize(forgeRarity)} · $${formatNumber(cost)}`} disabledReason={reason} onClick={() => forge(station.id, forgeRarity)} />;
          })}</div>
        </div>
        <div className="mt-3 space-y-2">{options.length === 0 ? <p className="rounded border p-3 text-center text-xs" style={{ borderColor: "var(--panel-border)", color: "var(--text-muted)" }}>No equipment owned for {station.name}.</p> : options.map((item) => {
          const installed = equipped[station.id] === item.id;
          const set = item.setId ? STATION_SETS.find((candidate) => candidate.id === item.setId) : undefined;
          const enhanceCost = getStationEnhancementCost(item);
          const reforgeCost = REFORGE_COST_SHARDS[item.rarity];
          const salvageYield = getStationSalvageYield(item, workshopLevels.mod_hunter ?? 0, workshopLevels.gear_recycler ?? 0);
          const enhanceReason = item.enhancementLevel >= enhancementCap ? `Maximum level +${enhancementCap}` : cash < enhanceCost ? `Need $${formatNumber(enhanceCost - cash)} more` : undefined;
          const reforgeReason = (workshopLevels.careful_modding ?? 0) < 1 ? "Requires Precision Reforge" : !canReforgeStationEquipment(item) ? "No secondary affix to reroll" : shards < reforgeCost ? `Need ${reforgeCost - shards} more Shard${reforgeCost - shards === 1 ? "" : "s"}` : undefined;
          return <article key={item.id} className="rounded border p-2" style={{ borderColor: installed ? "var(--accent)" : "var(--panel-border)", background: installed ? "var(--accent-bg)" : undefined }}>
            <div className="flex items-start gap-2"><ComposedEquipmentImage variant={{ slot: item.slot, rarity: item.rarity, set: item.setId, affixes: STATION_AFFIXES[item.slot] }} size={48} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><strong className="text-xs" style={{ color: "var(--text-white)" }}>{item.name} +{item.enhancementLevel}</strong><span className="text-[11px] uppercase" style={{ color: installed ? "var(--success)" : "var(--accent)" }}>{installed ? "Installed" : item.rarity}</span></div><p className="text-[11px]" style={{ color: set ? "var(--accent)" : "var(--text-muted)" }}>{set ? `${set.name} set · ${setCounts.get(set.id) ?? 0}/${set.slots.length} installed` : "No set affiliation"} · Source: {item.source}</p></div></div>
            <div className="mt-2 rounded border px-2 py-1.5" style={{ borderColor: "var(--panel-border)" }}><p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>Effective item effects {item.enhancementLevel > 0 ? `(+${item.enhancementLevel * 12}%)` : ""}</p>{item.effects.length === 0 ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>No item affixes; this piece can still activate its set.</p> : <ul className="mt-0.5 space-y-0.5">{getEnhancedStationEquipmentEffects(item).map((effect, index) => <li key={`${effect.type}-${index}`} className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatStationEffect(effect, item.effects[index], item.enhancementLevel)}</li>)}</ul>}</div>
            <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
              <StationAction label={installed ? "Remove" : "Install"} onClick={() => installed ? unequip(station.id) : equip(item.id)} />
              <StationAction label={`Enhance to +${item.enhancementLevel + 1} · $${formatNumber(enhanceCost)}`} disabledReason={enhanceReason} onClick={() => enhance(item.id)} />
              <StationAction label={`Reforge · ${reforgeCost} Shards`} disabledReason={reforgeReason} onClick={() => reforge(item.id)} />
              <StationAction label={`Salvage · +${salvageYield} Shards`} disabledReason={installed ? "Remove before salvaging" : undefined} onClick={() => salvage(item.id)} />
            </div>
          </article>;
        })}</div>
      </section>;
    })}</div>
  </div>;
}

function StationAction({ label, onClick, disabledReason }: { label: string; onClick: () => void; disabledReason?: string }) {
  return <div className="min-w-0"><button disabled={Boolean(disabledReason)} title={disabledReason} onClick={onClick} className="h-full min-h-8 w-full rounded border px-2 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}>{label}</button>{disabledReason && <p className="mt-0.5 text-[10px] leading-tight" style={{ color: "var(--warning)" }}>{disabledReason}</p>}</div>;
}

const InventoryPager = memo(function InventoryPager({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= INVENTORY_PAGE_SIZE) return null;
  const first = page * INVENTORY_PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * INVENTORY_PAGE_SIZE);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }} aria-label="Workshop inventory pages">
      <span data-testid="workshop-inventory-page-status" className="text-xs" style={{ color: "var(--text-muted)" }}>
        Showing {first}–{last} of {total} parts · Page {page + 1} of {pageCount}
      </span>
      <span className="flex gap-2">
        <button data-testid="workshop-inventory-previous" aria-label="Previous inventory page" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="rounded border px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}>Previous</button>
        <button data-testid="workshop-inventory-next" aria-label="Next inventory page" disabled={page >= pageCount - 1} onClick={() => onPageChange(page + 1)} className="rounded border px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}>Next</button>
      </span>
    </nav>
  );
});

function stationName(slot: GarageStationSlot): string {
  return GARAGE_STATIONS.find((station) => station.id === slot)?.name ?? slot.replaceAll("_", " ");
}

function formatStationEffect(effective: StationEquipmentEffect, base: StationEquipmentEffect, enhancementLevel: number): string {
  if (effective.type === "attribute" && base.type === "attribute") {
    const value = formatStationNumber(effective.value);
    const baseText = enhancementLevel > 0 ? ` (base +${formatStationNumber(base.value)})` : "";
    return `${ATTRIBUTE_LABELS[effective.attribute]} +${value}${baseText}`;
  }
  if (effective.type === "bonus" && base.type === "bonus") {
    const reducing = STATION_REDUCTION_BONUSES.has(effective.bonus);
    const sign = reducing ? "-" : "+";
    const value = effective.bonus === "tick_speed_reduction_ms" ? `${formatStationNumber(effective.value)} ms` : `${formatStationNumber(effective.value * 100)}%`;
    const baseValue = base.bonus === "tick_speed_reduction_ms" ? `${formatStationNumber(base.value)} ms` : `${formatStationNumber(base.value * 100)}%`;
    return `${sign}${value} ${STATION_BONUS_LABELS[effective.bonus]}${enhancementLevel > 0 ? ` (base ${sign}${baseValue})` : ""}`;
  }
  return "Unknown effect";
}

function formatStationNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function capitalize(value: string): string { return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`; }

function Philosophy() { return <div className="flex flex-col gap-3"><Notice text="Talents and playstyles now share one LP-funded Garage Philosophy: Scrapper, Racer, and Engineer." /><PlaystyleSubTab /></div>; }

function Action({ children, onClick, disabled = false, disabledReason }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; disabledReason?: string }) {
  const isDisabled = disabled || Boolean(disabledReason);
  return <span className="inline-flex min-w-0 flex-col items-start"><button disabled={isDisabled} title={disabledReason} onClick={onClick} className="rounded border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}>{children}</button>{disabledReason && <span className="mt-0.5 max-w-48 text-[10px] leading-tight" style={{ color: "var(--warning)" }}>{disabledReason}</span>}</span>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}><div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div><div className="font-mono text-sm" style={{ color: "var(--text-white)" }}>{formatNumber(value)}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--text-muted)" }}>{text}</div>; }
function LockedAction({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <div className="rounded-lg border p-5 text-center text-sm" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--text-muted)" }}>
    <p>{text}</p><button onClick={onClick} className="mt-3 min-h-11 rounded-lg px-4 py-2 font-semibold" style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}>{action}</button>
  </div>;
}
function Notice({ text }: { text: string }) { return <div className="rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)", color: "var(--text-secondary)" }}>{text}</div>; }
function signed(value: number): string { const rounded = Math.round(value * 10) / 10; return `${rounded > 0 ? "+" : ""}${rounded}`; }

function partModelScore(definitionId: string): number {
  const definition = PART_DEFINITIONS.find((part) => part.id === definitionId);
  return definition
    ? definition.minTier * 1_000_000 + (definition.basePower + definition.baseReliability) * 1_000 + definition.scrapValue
    : 0;
}

function formatMaterialCost(cost: EnhancementCost): string {
  return Object.entries(cost)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([id, amount]) => `${amount} ${MATERIAL_DEFINITIONS.find((material) => material.id === id)?.name ?? id}`)
    .join(" + ");
}

function formatMaterialShortfall(
  cost: EnhancementCost,
  materials: Readonly<Record<MaterialType, number>>,
): string {
  return Object.entries(cost)
    .flatMap(([id, amount]) => {
      const missing = Math.max(0, (amount ?? 0) - (materials[id as MaterialType] ?? 0));
      return missing > 0
        ? [`${missing} ${MATERIAL_DEFINITIONS.find((material) => material.id === id)?.name ?? id}`]
        : [];
    })
    .join(" + ");
}
