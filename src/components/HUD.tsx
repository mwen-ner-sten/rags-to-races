"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import { getVehicleById } from "@/data/vehicles";
import { touchLastSaved } from "@/utils/saveLoad";

function useAutoSaveIndicator() {
  const [label, setLabel] = useState<string | null>(null);

  // Flash "Saved" briefly whenever any store state changes
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const unsub = useGameStore.subscribe(() => {
      touchLastSaved();
      setLabel("Saved");
      clearTimeout(timeout);
      timeout = setTimeout(() => setLabel(null), 1500);
    });
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  return label;
}

export default function HUD() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const garage = useGameStore((s) => s.garage);
  const fatigue = useGameStore((s) => s.fatigue);
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const activeMomentumTiers = useGameStore((s) => s.activeMomentumTiers);
  const teamPoints = useGameStore((s) => s.teamPoints);
  const ownerPoints = useGameStore((s) => s.ownerPoints);
  const trackPrestigeTokens = useGameStore((s) => s.trackPrestigeTokens);
  const teamEraCount = useGameStore((s) => s.teamEraCount);
  const ownerEraCount = useGameStore((s) => s.ownerEraCount);
  const trackEraCount = useGameStore((s) => s.trackEraCount);
  const saveLabel = useAutoSaveIndicator();

  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const activeVehicle = garage.find((v) => v.id === activeVehicleId);
  const vehicleDef = activeVehicle ? getVehicleById(activeVehicle.definitionId) : null;

  // Show fatigue during the tutorial step that teaches about it (step 14)
  const showFatigue = fatigue > 0 || tutorialStep === 14;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white">🏎 Rags to Races</span>
          {prestigeCount > 0 && (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
              Prestige {prestigeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {saveLabel && (
            <span className="text-xs text-zinc-600 transition-opacity">
              ✓ {saveLabel}
            </span>
          )}
          {tutorialStep === 14 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1">
              <span className="text-sm">🚀</span>
              <span className={`font-mono text-xs font-semibold ${lifetimeScrapBucks >= 50000 ? "text-green-400" : "text-zinc-300"}`}>
                ${formatNumber(lifetimeScrapBucks)}/50k
              </span>
              <span className="text-zinc-600">·</span>
              <span className={`font-mono text-xs font-semibold ${repPoints >= 5000 ? "text-green-400" : "text-zinc-300"}`}>
                {formatNumber(repPoints)}/5k Rep
              </span>
            </div>
          )}
          <Stat label="Scrap Bucks" value={`$${formatNumber(scrapBucks)}`} color="text-green-400" />
          <Stat label="Rep" value={formatNumber(repPoints)} color="text-blue-400" />
          {showFatigue && (
            <Stat
              label="Fatigue"
              value={`${fatigue}%`}
              color={fatigue >= 75 ? "text-red-400" : fatigue >= 50 ? "text-orange-400" : fatigue >= 25 ? "text-yellow-400" : "text-zinc-400"}
            />
          )}
          {legacyPoints > 0 && (
            <Stat label="LP" value={String(legacyPoints)} color="text-purple-400" />
          )}
          {teamEraCount > 0 && (
            <Stat label="TP" value={String(teamPoints)} color="text-cyan-400" />
          )}
          {ownerEraCount > 0 && (
            <Stat label="OP" value={String(ownerPoints)} color="text-pink-400" />
          )}
          {trackEraCount > 0 && (
            <Stat label="PT" value={String(trackPrestigeTokens)} color="text-yellow-400" />
          )}
          {activeMomentumTiers.length > 0 && (
            <div className="flex flex-col items-end">
              <span className="font-mono text-sm font-semibold text-amber-400">
                {activeMomentumTiers.length}x
              </span>
              <span className="text-xs text-zinc-500">Momentum</span>
            </div>
          )}
          {vehicleDef && activeVehicle && (
            <Stat
              label="Active"
              value={`${vehicleDef.name} · ${Math.floor(activeVehicle.stats.performance)} pts`}
              color="text-orange-400"
            />
          )}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className={`font-mono text-sm font-semibold ${color}`}>{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}
