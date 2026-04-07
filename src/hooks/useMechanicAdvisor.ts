"use client";

import { useCallback, useState } from "react";
import { useGameStore } from "@/state/store";
import { getVehicleById } from "@/data/vehicles";
import { getPartById } from "@/data/parts";
import { getCircuitById } from "@/data/circuits";
import type { MechanicContext } from "@/lib/mechanic-types";
import type { GameState } from "@/state/store";

function buildContext(state: GameState): MechanicContext {
  // Active vehicle summary
  let activeVehicle: MechanicContext["activeVehicle"] = null;
  if (state.activeVehicleId) {
    const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
    if (vehicle) {
      const def = getVehicleById(vehicle.definitionId);
      const partSummary = Object.entries(vehicle.parts).map(([slot, installed]) => {
        const partDef = getPartById(installed.part.definitionId);
        return `${slot}: ${partDef?.name ?? "unknown"} (${installed.part.condition})`;
      });
      activeVehicle = {
        name: def?.name ?? vehicle.definitionId,
        tier: def?.tier ?? 0,
        condition: vehicle.condition ?? 100,
        stats: {
          speed: vehicle.stats.speed,
          handling: vehicle.stats.handling,
          reliability: vehicle.stats.reliability,
          performance: vehicle.stats.performance,
        },
        partSummary,
      };
    }
  }

  // Inventory highlights
  const partCount = state.inventory.length;
  const conditionOrder = ["artifact", "mythic", "legendary", "polished", "pristine", "good", "decent", "worn", "rusted"];
  let bestCondition = "none";
  if (partCount > 0) {
    bestCondition = state.inventory.reduce((best, p) => {
      const bestIdx = conditionOrder.indexOf(best);
      const pIdx = conditionOrder.indexOf(p.condition);
      return pIdx < bestIdx ? p.condition : best;
    }, "rusted");
  }
  const inventoryHighlights = partCount === 0
    ? "Empty inventory"
    : `${partCount} parts, best condition: ${bestCondition}`;

  // Selected circuit
  let selectedCircuit: MechanicContext["selectedCircuit"] = null;
  const circuit = getCircuitById(state.selectedCircuitId);
  if (circuit) {
    selectedCircuit = { name: circuit.name, tier: circuit.tier, difficulty: circuit.difficulty };
  }

  // Recent races
  const recent = state.raceHistory.slice(0, 5);
  let recentRaces = "No races yet";
  if (recent.length > 0) {
    const wins = recent.filter((r) => r.result === "win").length;
    const losses = recent.filter((r) => r.result === "loss").length;
    const dnfs = recent.filter((r) => r.result === "dnf").length;
    recentRaces = `Last ${recent.length}: ${wins} wins, ${losses} losses, ${dnfs} DNFs`;
  }

  // Progression summary
  const vehicleTiers = state.unlockedVehicleIds.map((id) => getVehicleById(id)?.tier ?? 0);
  const maxVehicleTier = vehicleTiers.length > 0 ? Math.max(...vehicleTiers) : 0;
  const circuitCount = state.unlockedCircuitIds.length;
  const progression = `Max vehicle tier: ${maxVehicleTier}, ${circuitCount} circuits unlocked, prestige count: ${state.prestigeCount}`;

  return {
    activeVehicle,
    inventoryHighlights,
    selectedCircuit,
    recentRaces,
    currencies: { scrapBucks: state.scrapBucks, repPoints: state.repPoints },
    fatigue: state.fatigue,
    winStreak: state.winStreak,
    progression,
  };
}

export function useMechanicAdvisor() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askMechanic = useCallback(async () => {
    const state = useGameStore.getState();
    const context = buildContext(state);

    setIsLoading(true);
    setError(null);
    setResponse("");

    try {
      const res = await fetch("/api/mechanic-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });

      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("Mechanic is off the clock — OPENROUTER_API_KEY not configured.");
        }
        throw new Error(`Mechanic hit a snag (${res.status})`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResponse(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { response, isLoading, error, askMechanic };
}
