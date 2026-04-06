"use client";

import type { VehicleDefinition } from "@/data/vehicles";
import type { BuiltVehicle } from "@/engine/build";
import { CONDITION_PENALTY_THRESHOLD } from "@/data/vehicles";
import { getPartById } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import { Section, Row, TooltipPanel, HoverTooltipWrapper } from "@/components/TooltipPrimitives";

function conditionColor(condition: number): string {
  if (condition >= CONDITION_PENALTY_THRESHOLD) return "var(--success, #6aaa3a)";
  if (condition >= 40) return "var(--warning, #c4872a)";
  return "var(--danger, #e05c1a)";
}

function statColor(computed: number, base: number): string | undefined {
  if (computed > base * 1.05) return "var(--success, #6aaa3a)";
  if (computed < base * 0.95) return "var(--danger, #e05c1a)";
  return undefined;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function VehicleTooltipContent({
  anchorRect,
  vehicleDef,
  activeVehicle,
}: {
  anchorRect: DOMRect;
  vehicleDef: VehicleDefinition;
  activeVehicle: BuiltVehicle;
}) {
  const { stats, condition, totalRaces } = activeVehicle;
  const base = vehicleDef.baseStats;

  const conditionPenalty =
    condition < CONDITION_PENALTY_THRESHOLD
      ? Math.round((1 - (0.3 + (condition / CONDITION_PENALTY_THRESHOLD) * 0.7)) * 100)
      : 0;

  return (
    <TooltipPanel anchorRect={anchorRect}>
      {/* Vehicle overview */}
      <Section label="Vehicle">
        <Row label="Type" value={vehicleDef.name} />
        <Row label="Tier" value={`T${vehicleDef.tier}`} dim />
        <Row label="Performance" value={`${Math.floor(stats.performance)} pts`} color="var(--accent, #c83e0c)" />
        <Row
          label="Condition"
          value={
            conditionPenalty > 0
              ? `${condition}% (−${conditionPenalty}% stats)`
              : `${condition}%`
          }
          color={conditionColor(condition)}
        />
      </Section>

      {/* Stats */}
      <Section label="Stats">
        <Row label="Speed" value={Math.floor(stats.speed)} color={statColor(stats.speed, base.speed)} />
        <Row label="Handling" value={Math.floor(stats.handling)} color={statColor(stats.handling, base.handling)} />
        <Row label="Reliability" value={Math.floor(stats.reliability)} color={statColor(stats.reliability, base.reliability)} />
        <Row label="Weight" value={`${Math.floor(stats.weight)} lbs`} color={stats.weight > base.weight * 1.1 ? "var(--warning, #c4872a)" : undefined} />
      </Section>

      {/* Parts */}
      <Section label="Parts">
        {vehicleDef.slots.map((slotConfig) => {
          const installed = activeVehicle.parts[slotConfig.slot];
          if (!installed) {
            return (
              <Row
                key={slotConfig.slot}
                label={capitalize(slotConfig.slot)}
                value="Empty"
                dim
              />
            );
          }
          const partDef = getPartById(installed.part.definitionId);
          const partName = partDef?.name ?? installed.part.definitionId;
          return (
            <div key={slotConfig.slot}>
              <Row
                label={capitalize(slotConfig.slot)}
                value={`${partName} [${installed.part.condition}]`}
              />
              {installed.addons.map((addon, i) => {
                const addonDef = getAddonById(addon.definitionId);
                const addonName = addonDef?.name ?? addon.definitionId;
                return (
                  <Row
                    key={`${slotConfig.slot}-addon-${i}`}
                    label={`  + ${addonName}`}
                    value={`[${addon.condition}]`}
                    dim
                  />
                );
              })}
            </div>
          );
        })}
      </Section>

      {/* Racing */}
      <Section label="Racing">
        <Row label="Total races" value={totalRaces.toLocaleString()} />
        <Row label="Race tiers" value={vehicleDef.raceTiers.join(", ")} dim />
      </Section>
    </TooltipPanel>
  );
}

export default function VehicleTooltip({
  vehicleDef,
  activeVehicle,
  children,
}: {
  vehicleDef: VehicleDefinition;
  activeVehicle: BuiltVehicle;
  children: React.ReactNode;
}) {
  return (
    <HoverTooltipWrapper
      renderTooltip={(anchorRect) => (
        <VehicleTooltipContent
          anchorRect={anchorRect}
          vehicleDef={vehicleDef}
          activeVehicle={activeVehicle}
        />
      )}
    >
      {children}
    </HoverTooltipWrapper>
  );
}
