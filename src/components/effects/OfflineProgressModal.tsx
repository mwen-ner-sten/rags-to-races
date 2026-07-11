"use client";

import type { OfflineResult } from "@/engine/tick";
import { ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { CHALLENGE_DEFINITIONS } from "@/data/challenges";
import { MATERIAL_DEFINITIONS } from "@/data/materials";

interface OfflineProgressModalProps {
  timeAwayMinutes: number;
  result: OfflineResult;
  onDismiss: () => void;
}

function formatTimeAway(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
  boxShadow:
    "0 0 48px rgba(234, 179, 8, 0.22), 0 0 0 1px rgba(255,255,255,0.06), 0 20px 40px -8px rgba(0,0,0,0.5)",
};

interface StatRowProps {
  icon: string;
  label: string;
  value: string;
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-1.5">
      <span className="flex shrink-0 items-center gap-2 text-sm text-zinc-300">
        <span className="w-5 text-center">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-amber-300">{value}</span>
    </div>
  );
}

export default function OfflineProgressModal({
  timeAwayMinutes,
  result,
  onDismiss,
}: OfflineProgressModalProps) {
  const rows: StatRowProps[] = [];

  if (result.partsScavenged > 0) {
    rows.push({ icon: "\u{1F529}", label: "Parts scavenged", value: `${result.partsScavenged}` });
  }
  if (result.raceSalvageFound > 0) {
    rows.push({ icon: "\u{1F3CE}\uFE0F", label: "Race salvage found", value: `${result.raceSalvageFound}` });
  }
  if (result.partsFound.length > 0) {
    rows.push({ icon: "\u{1F4E6}", label: "Kept in inventory", value: `${result.partsFound.length}` });
  }
  if (result.junkFilteredParts > 0) {
    rows.push({ icon: "\u{1F5D1}\uFE0F", label: "Junk Filter auto-sold", value: `${result.junkFilteredParts} · +$${result.junkFilterScrap.toLocaleString()}` });
  }
  if (result.overflowPartsAutoSold > 0) {
    rows.push({ icon: "\u{267B}\uFE0F", label: "Inventory overflow sold", value: `${result.overflowPartsAutoSold} · +$${result.overflowScrap.toLocaleString()}` });
  }
  if (result.scrapsEarned !== 0) {
    const sign = result.scrapsEarned > 0 ? "+" : "−";
    rows.push({ icon: "\u{1F4B0}", label: "Net Scrap Bucks", value: `${sign}$${Math.abs(result.scrapsEarned).toLocaleString()}` });
  }
  if (result.repEarned > 0) {
    rows.push({ icon: "\u{2B50}", label: "Rep earned", value: `+${Math.round(result.repEarned).toLocaleString()}` });
  }
  if (result.racesCompleted > 0) {
    rows.push({ icon: "\u{1F3C1}", label: "Races completed", value: `${result.racesCompleted}` });
    rows.push({ icon: "\u{1F3C6}", label: "Race wins", value: `${result.winsCompleted}` });
  }
  if (result.entryFeesPaid > 0) {
    rows.push({ icon: "\u{1F39F}\uFE0F", label: "Entry fees paid", value: `−$${result.entryFeesPaid.toLocaleString()}` });
  }
  if (result.forgeTokensFound + result.challengeForgeTokens > 0) {
    rows.push({ icon: "\u{1FA99}", label: "Forge Tokens", value: `+${result.forgeTokensFound + result.challengeForgeTokens}` });
  }
  const materialRewards = Object.entries(result.challengeMaterials)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([id, amount]) => `+${amount} ${MATERIAL_DEFINITIONS.find((material) => material.id === id)?.name ?? id}`);
  if (materialRewards.length > 0) {
    rows.push({ icon: "\u{1F9F1}", label: "Challenge materials", value: materialRewards.join(" · ") });
  }
  if (result.completedChallengeIds.length > 0) {
    const names = result.completedChallengeIds.map(
      (id) => CHALLENGE_DEFINITIONS.find((challenge) => challenge.id === id)?.name ?? id,
    );
    rows.push({ icon: "\u2705", label: "Challenges completed", value: names.join(", ") });
  }
  if (result.newAchievementIds.length > 0) {
    const names = result.newAchievementIds.map((id) => ACHIEVEMENTS_BY_ID[id]?.name ?? id);
    rows.push({ icon: "\u{1F3C5}", label: "Achievements earned", value: names.join(", ") });
  }
  if (result.lootGearDrops.length > 0) {
    rows.push({ icon: "\u{1F392}", label: "Station Equipment", value: `+${result.lootGearDrops.length}` });
  }
  if (result.stationEquipmentAutoSalvaged > 0) {
    rows.push({ icon: "\u267B\uFE0F", label: "Equipment auto-salvaged", value: `${result.stationEquipmentAutoSalvaged}` });
  }
  if (result.modDrops.length + result.reforgeShardsFound > 0) {
    rows.push({ icon: "\u{1F527}", label: "Reforge Shards", value: `+${result.modDrops.length + result.reforgeShardsFound}` });
  }
  if (result.vehicleWearTotal > 0) {
    rows.push({ icon: "\u{1F6E0}\uFE0F", label: "Vehicle wear", value: `−${result.vehicleWearTotal}` });
  }
  if (result.vehicleRepairTotal > 0) {
    rows.push({ icon: "\u{1FA79}", label: "Auto-repair", value: `+${result.vehicleRepairTotal}` });
  }
  if (result.racesCompleted > 0) {
    rows.push({ icon: "\u{1F62E}\u{200D}\u{1F4A8}", label: "Final fatigue", value: `${result.finalFatigue}%` });
    if (result.finalVehicleCondition != null) {
      rows.push({ icon: "\u{1F697}", label: "Final vehicle condition", value: `${result.finalVehicleCondition}%` });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onDismiss}
    >
      <div
        className="animate-fade-up mx-4 w-full max-w-sm rounded-xl border border-amber-500/20 p-6"
        style={CARD_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-center text-xl font-bold text-amber-300">
          Welcome Back!
        </h2>
        <p className="mb-4 text-center text-sm text-zinc-400">
          You were away for {formatTimeAway(timeAwayMinutes)}
        </p>

        {rows.length > 0 ? (
          <div className="mb-5 divide-y divide-zinc-700/50 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1">
            {rows.map((row) => (
              <StatRow key={row.label} {...row} />
            ))}
          </div>
        ) : (
          <p className="mb-5 text-center text-sm text-zinc-500">
            Nothing happened while you were away.
          </p>
        )}

        <button
          onClick={onDismiss}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
