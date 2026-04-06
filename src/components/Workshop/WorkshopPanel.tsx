"use client";

import { useGameStore } from "@/state/store";
import { UPGRADE_DEFINITIONS, UPGRADE_CATEGORIES, getUpgradeCost, type UpgradeCategory } from "@/data/upgrades";
import { formatNumber } from "@/utils/format";

function isUpgradeUnlocked(
  upgradeId: string,
  repPoints: number,
  workshopLevels: Record<string, number>,
): boolean {
  const def = UPGRADE_DEFINITIONS.find((u) => u.id === upgradeId);
  if (!def?.unlockRequirement) return true;
  if (def.unlockRequirement.repPoints && repPoints < def.unlockRequirement.repPoints) return false;
  if (def.unlockRequirement.workshopUpgradeId) {
    const reqLevel = workshopLevels[def.unlockRequirement.workshopUpgradeId] ?? 0;
    if (reqLevel < 1) return false;
  }
  if (def.unlockRequirement.workshopUpgradeIds) {
    for (const reqId of def.unlockRequirement.workshopUpgradeIds) {
      if ((workshopLevels[reqId] ?? 0) < 1) return false;
    }
  }
  return true;
}

export default function WorkshopPanel() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {UPGRADE_CATEGORIES.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat.id}
          label={cat.label}
          icon={cat.icon}
          scrapBucks={scrapBucks}
          repPoints={repPoints}
          workshopLevels={workshopLevels}
          purchaseUpgrade={purchaseUpgrade}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  category,
  label,
  icon,
  scrapBucks,
  repPoints,
  workshopLevels,
  purchaseUpgrade,
}: {
  category: UpgradeCategory;
  label: string;
  icon: string;
  scrapBucks: number;
  repPoints: number;
  workshopLevels: Record<string, number>;
  purchaseUpgrade: (id: string) => void;
}) {
  const upgrades = UPGRADE_DEFINITIONS.filter((u) => u.category === category);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        <span>{icon}</span>
        {label}
      </h3>
      <div className="flex flex-col gap-2">
        {upgrades.map((upgrade) => {
          const level = workshopLevels[upgrade.id] ?? 0;
          const maxed = level >= upgrade.maxLevel;
          const unlocked = isUpgradeUnlocked(upgrade.id, repPoints, workshopLevels);
          const cost = maxed ? 0 : getUpgradeCost(upgrade, level);
          const canAfford = scrapBucks >= cost;

          return (
            <div
              key={upgrade.id}
              className={`rounded-md border p-2.5 sm:p-3 ${
                !unlocked
                  ? "border-zinc-800 bg-zinc-900/50 opacity-50"
                  : maxed
                    ? "border-green-800/50 bg-green-900/10"
                    : "border-zinc-700 bg-zinc-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{upgrade.name}</span>
                    <LevelPips level={level} max={upgrade.maxLevel} />
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{upgrade.description}</p>
                  {!unlocked && upgrade.unlockRequirement && (
                    <p className="mt-1 text-xs text-zinc-600">
                      {upgrade.unlockRequirement.repPoints
                        ? `Requires ${formatNumber(upgrade.unlockRequirement.repPoints)} Rep`
                        : ""}
                      {upgrade.unlockRequirement.workshopUpgradeId
                        ? `Requires: ${UPGRADE_DEFINITIONS.find((u) => u.id === upgrade.unlockRequirement?.workshopUpgradeId)?.name ?? "?"}`
                        : ""}
                      {upgrade.unlockRequirement.workshopUpgradeIds
                        ? `Requires: ${upgrade.unlockRequirement.workshopUpgradeIds.map((id) => UPGRADE_DEFINITIONS.find((u) => u.id === id)?.name ?? id).join(" + ")}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {unlocked && !maxed && (
                    <button
                      data-tutorial="workshop-upgrade-btn"
                      onClick={() => purchaseUpgrade(upgrade.id)}
                      disabled={!canAfford}
                      className="rounded border border-orange-600 px-2.5 py-1 text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ${formatNumber(cost)}
                    </button>
                  )}
                  {maxed && (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-400">
                      MAX
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LevelPips({ level, max }: { level: number; max: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-3 rounded-sm ${
            i < level ? "bg-orange-500" : "bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
