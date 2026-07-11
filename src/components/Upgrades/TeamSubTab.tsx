"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { CREW_ROLE_LABELS } from "@/data/crew";
import { getGameEffectValue } from "@/data/gameEffects";
import { getVehicleCircuitIneligibilityReason } from "@/engine/eligibility";
import CrewPanel from "@/components/Crew/CrewPanel";
import {
  TEAM_UPGRADE_DEFINITIONS,
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  teamUpgradeCost,
  type TeamUpgradeCategory,
} from "@/data/teamUpgrades";

export default function TeamSubTab() {
  const teamPoints = useGameStore((s) => s.teamPoints);
  const teamUpgradeLevels = useGameStore((s) => s.teamUpgradeLevels);
  const purchaseTeamUpgrade = useGameStore((s) => s.purchaseTeamUpgrade);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Team, Crew & Fleet
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {teamPoints} TP
        </span>
      </div>

      <FleetPrograms />
      <CrewPanel />

      {TEAM_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          currency={teamPoints}
          levels={teamUpgradeLevels}
          onPurchase={purchaseTeamUpgrade}
        />
      ))}
    </div>
  );
}

function FleetPrograms() {
  const garage = useGameStore((s) => s.garage); const activeVehicleId = useGameStore((s) => s.activeVehicleId); const raceHistory = useGameStore((s) => s.raceHistory);
  const crew = useGameStore((s) => s.crewRoster); const assignments = useGameStore((s) => s.fleetAssignments);
  const teamUpgradeLevels = useGameStore((s) => s.teamUpgradeLevels);
  const start = useGameStore((s) => s.startFleetAssignment); const collect = useGameStore((s) => s.collectFleetAssignment);
  const completedCircuitIds = [...new Set(raceHistory.filter((outcome) => outcome.result === "win").map((outcome) => outcome.circuitId))];
  const [circuitByVehicle, setCircuitByVehicle] = useState<Record<string, string>>({});
  const [crewByVehicle, setCrewByVehicle] = useState<Record<string, string>>({});
  const fleetVehicles = garage.filter((vehicle) => vehicle.id !== activeVehicleId);
  const runningAssignments = assignments.filter((assignment) => assignment.status === "running");
  const busyCrewIds = new Set(assignments.flatMap((assignment) => assignment.crewId ? [assignment.crewId] : []));
  const fleetSlots = 1 + Math.floor(getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, teamUpgradeLevels, "active_vehicle_slot"));
  const fleetAtCapacity = runningAssignments.length >= fleetSlots;
  return <section className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-heading)" }}>Fleet Programs</h3><span className="font-mono text-xs" style={{ color: fleetAtCapacity ? "var(--warning)" : "var(--accent)" }}>{runningAssignments.length}/{fleetSlots} running</span></div>
    <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>Assign healthy, tier-compatible non-focus vehicles to completed circuits. Programs settle at 60% of base rewards before permanent income bonuses, apply 5 condition wear, grant 5 base assigned-crew XP before Crew Training, and do not unlock circuits or vehicles.</p>
    {completedCircuitIds.length === 0 ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>Win a circuit with the focus vehicle before automating it.</p> : fleetVehicles.length === 0 ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>Build a second vehicle to start a Fleet Program.</p> : <div className="space-y-2">{fleetVehicles.map((vehicle) => {
      const assignment = assignments.find((candidate) => candidate.vehicleId === vehicle.id);
      const eligibleCircuitIds = completedCircuitIds.filter((id) =>
        getVehicleCircuitIneligibilityReason(
          vehicle,
          CIRCUIT_DEFINITIONS.find((circuit) => circuit.id === id),
        ) === null,
      );
      const requestedCircuit = circuitByVehicle[vehicle.id];
      const selectedCircuit = requestedCircuit && eligibleCircuitIds.includes(requestedCircuit)
        ? requestedCircuit
        : eligibleCircuitIds[0] ?? "";
      const requestedCrewId = crewByVehicle[vehicle.id] ?? "";
      const eligibleCrew = crew.filter((member) => !busyCrewIds.has(member.id));
      const selectedCrewId = eligibleCrew.some((member) => member.id === requestedCrewId) ? requestedCrewId : "";
      const assignedCrew = assignment?.crewId ? crew.find((member) => member.id === assignment.crewId) : null;
      const definition = getVehicleById(vehicle.definitionId);
      return <article key={vehicle.id} className="rounded border p-2" style={{ borderColor: "var(--panel-border)" }}>
        <div className="flex flex-wrap items-center gap-2"><strong className="mr-auto text-xs" style={{ color: "var(--text-white)" }}>{definition?.name ?? vehicle.definitionId}</strong>{assignment ? <><span className="text-xs" style={{ color: assignment.status === "complete" ? "var(--success)" : "var(--accent)" }}>{assignment.status === "complete" ? `Ready: $${assignment.rewards.scrap} + ${assignment.rewards.materials} material${assignment.rewards.materials === 1 ? "" : "s"}` : `${assignment.remainingTicks} ticks remaining`}</span>{assignment.status === "complete" && <button onClick={() => collect(assignment.id)} className="rounded border px-2 py-1 text-xs font-semibold" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>Collect rewards</button>}</> : null}</div>
        {assignment ? <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>Assigned crew: {assignedCrew ? `${assignedCrew.name} · ${CREW_ROLE_LABELS[assignedCrew.role]} Lv.${assignedCrew.level}` : assignment.crewId ? "Unavailable crew" : "Uncrewed"}</p> : <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Circuit<select aria-label={`Circuit for ${definition?.name ?? vehicle.definitionId}`} value={selectedCircuit} disabled={eligibleCircuitIds.length === 0} onChange={(event) => setCircuitByVehicle((current) => ({ ...current, [vehicle.id]: event.target.value }))} className="mt-1 block w-full rounded border px-2 py-1.5 text-xs disabled:opacity-40" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}>{eligibleCircuitIds.length === 0 && <option value="">No eligible completed circuit</option>}{eligibleCircuitIds.map((id) => <option key={id} value={id}>{CIRCUIT_DEFINITIONS.find((circuit) => circuit.id === id)?.name ?? id}</option>)}</select>{eligibleCircuitIds.length === 0 && <span className="mt-1 block text-[11px]" style={{ color: "var(--warning)" }}>{(vehicle.condition ?? 100) <= 0 ? "Repair this vehicle before assigning it." : "No completed circuit accepts this vehicle tier."}</span>}</label>
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Crew<select aria-label={`Crew for ${definition?.name ?? vehicle.definitionId}`} value={selectedCrewId} onChange={(event) => setCrewByVehicle((current) => ({ ...current, [vehicle.id]: event.target.value }))} className="mt-1 block w-full rounded border px-2 py-1.5 text-xs" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}><option value="">No crew (no XP)</option>{eligibleCrew.map((member) => <option key={member.id} value={member.id}>{member.name} · {CREW_ROLE_LABELS[member.role]} Lv.{member.level}</option>)}</select></label>
          <div className="self-end"><button disabled={fleetAtCapacity || !selectedCircuit} onClick={() => start(vehicle.id, selectedCircuit, selectedCrewId || undefined)} className="w-full rounded border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>Start program</button>{fleetAtCapacity && <p className="mt-1 text-[11px]" style={{ color: "var(--warning)" }}>All {fleetSlots} Fleet slots are running.</p>}</div>
        </div>}
      </article>;
    })}</div>}
  </section>;
}

function CategorySection({
  category,
  currency,
  levels,
  onPurchase,
}: {
  category: TeamUpgradeCategory;
  currency: number;
  levels: Record<string, number>;
  onPurchase: (id: string) => void;
}) {
  const upgrades = TEAM_UPGRADE_DEFINITIONS.filter(
    (u) => u.category === category,
  );

  return (
    <div>
      <h3
        style={{ color: "var(--text-dim)" }}
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
      >
        {TEAM_CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {upgrades.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = maxed ? 0 : teamUpgradeCost(def, level + 1);
          const canAfford = currency >= cost;
          const currentEffect = def.effect.valuePerLevel * level;
          const nextEffect = maxed
            ? currentEffect
            : def.effect.valuePerLevel * (level + 1);

          return (
            <div
              key={def.id}
              style={{
                background: "var(--panel-bg)",
                borderColor: maxed
                  ? "var(--accent-border)"
                  : "var(--panel-border)",
              }}
              className="rounded-lg border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    style={{ color: "var(--text-heading)" }}
                    className="text-sm font-semibold"
                  >
                    {def.name}
                  </div>
                  <div
                    style={{ color: "var(--text-dim)" }}
                    className="text-xs"
                  >
                    {def.description}
                  </div>
                </div>
                <span
                  style={{
                    color: maxed ? "var(--accent)" : "var(--text-dim)",
                  }}
                  className="whitespace-nowrap font-mono text-xs"
                >
                  {level}/{def.maxLevel}
                </span>
              </div>

              {level > 0 && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-1 font-mono text-xs"
                >
                  Current: {formatEffect(def.effect.type, currentEffect)}
                  {!maxed && (
                    <span style={{ color: "var(--text-dim)" }}>
                      {" \u2192 "}
                      {formatEffect(def.effect.type, nextEffect)}
                    </span>
                  )}
                </div>
              )}

              {!maxed && (
                <button
                  onClick={() => onPurchase(def.id)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? "var(--accent)" : "transparent",
                    color: canAfford
                      ? "var(--panel-bg)"
                      : "var(--text-dim)",
                    borderColor: "var(--panel-border)",
                  }}
                  className="mt-2 w-full rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cost} TP
                </button>
              )}
              {maxed && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-2 text-center text-xs font-semibold"
                >
                  MAXED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatEffect(type: string, value: number): string {
  switch (type) {
    case "lp_multiplier":
    case "momentum_threshold_reduction":
    case "crew_xp_multiplier":
    case "crew_xp_retention":
    case "enhancement_cost_reduction":
    case "gear_drop_rate":
    case "forge_token_rate":
    case "base_race_performance":
    case "starting_rep_multiplier":
      return `+${Math.round(value * 100)}%`;
    case "quick_start_bonus":
      return `$${value}`;
    case "keep_legacy_count":
    case "workshop_slot":
    case "active_vehicle_slot":
    case "crew_slot":
    case "starting_materials":
    case "talent_tier_unlock":
      return `${value}`;
    case "bonus_attr_points":
      return `${value} pts`;
    case "fatigue_cap_reduction":
      return `-${value}`;
    case "unlock_t6_parts":
    case "crew_second_spec":
      return value >= 1 ? "Unlocked" : "Locked";
    default:
      return `${value}`;
  }
}
