"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/state/store";
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_CATEGORIES,
  type AchievementCategory,
  type AchievementDefinition,
  type AchievementStats,
} from "@/data/achievements";
import { getAchievementProgress } from "@/engine/achievements";
import { formatNumber } from "@/utils/format";

export default function AchievementsSubTab() {
  const earnedAchievements = useGameStore((s) => s.earnedAchievements);
  const lifetimeRacesAllTime = useGameStore((s) => s.lifetimeRacesAllTime);
  const lifetimeWinsAllTime = useGameStore((s) => s.lifetimeWinsAllTime);
  const lifetimeScrapBucksAllTime = useGameStore((s) => s.lifetimeScrapBucksAllTime);
  const lifetimePartsScavengedAllTime = useGameStore((s) => s.lifetimePartsScavengedAllTime);
  const lifetimeVehiclesBuiltAllTime = useGameStore((s) => s.lifetimeVehiclesBuiltAllTime);
  const bestWinStreakAllTime = useGameStore((s) => s.bestWinStreakAllTime);
  const highestVehicleTierBuilt = useGameStore((s) => s.highestVehicleTierBuilt);
  const totalForgeTokensEarned = useGameStore((s) => s.totalForgeTokensEarned);
  const uniqueVehicleTypesBuilt = useGameStore((s) => s.uniqueVehicleTypesBuilt);
  const lifetimeScrapResets = useGameStore((s) => s.lifetimeScrapResets);
  const lifetimeLPAllTime = useGameStore((s) => s.lifetimeLPAllTime);
  const teamEraCount = useGameStore((s) => s.teamEraCount);
  const ownerEraCount = useGameStore((s) => s.ownerEraCount);
  const lifetimeTotalDecomposed = useGameStore((s) => s.lifetimeTotalDecomposed);
  const highestConditionReached = useGameStore((s) => s.highestConditionReached);

  const [activeCategory, setActiveCategory] = useState<AchievementCategory>("racing");

  const stats: AchievementStats = useMemo(
    () => ({
      lifetimeRacesAllTime,
      lifetimeWinsAllTime,
      lifetimeScrapBucksAllTime,
      lifetimePartsScavengedAllTime,
      lifetimeVehiclesBuiltAllTime,
      bestWinStreakAllTime,
      highestVehicleTierBuilt,
      totalForgeTokensEarned,
      uniqueVehicleTypesBuiltCount: uniqueVehicleTypesBuilt.length,
      lifetimeScrapResets,
      lifetimeLPAllTime,
      teamEraCount,
      ownerEraCount,
      lifetimeTotalDecomposed,
      highestConditionReached,
    }),
    [
      lifetimeRacesAllTime,
      lifetimeWinsAllTime,
      lifetimeScrapBucksAllTime,
      lifetimePartsScavengedAllTime,
      lifetimeVehiclesBuiltAllTime,
      bestWinStreakAllTime,
      highestVehicleTierBuilt,
      totalForgeTokensEarned,
      uniqueVehicleTypesBuilt.length,
      lifetimeScrapResets,
      lifetimeLPAllTime,
      teamEraCount,
      ownerEraCount,
      lifetimeTotalDecomposed,
      highestConditionReached,
    ],
  );

  const earnedSet = useMemo(() => new Set(earnedAchievements), [earnedAchievements]);

  const categoryAchievements = useMemo(() => {
    const map = new Map<AchievementCategory, AchievementDefinition[]>();
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      map.set(cat.id, []);
    }
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      map.get(def.category)!.push(def);
    }
    return map;
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<AchievementCategory, { earned: number; total: number }>();
    for (const [catId, defs] of categoryAchievements) {
      const earned = defs.filter((d) => earnedSet.has(d.id)).length;
      counts.set(catId, { earned, total: defs.length });
    }
    return counts;
  }, [categoryAchievements, earnedSet]);

  const totalEarned = earnedAchievements.length;
  const totalAchievements = ACHIEVEMENT_DEFINITIONS.length;
  const activeDefs = categoryAchievements.get(activeCategory) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Achievements
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="text-sm font-semibold font-mono"
        >
          {totalEarned} / {totalAchievements}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {ACHIEVEMENT_CATEGORIES.map((cat) => {
          const counts = categoryCounts.get(cat.id);
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: isActive ? "var(--accent)" : "var(--panel-bg)",
                borderColor: isActive ? "var(--accent)" : "var(--panel-border)",
                color: isActive ? "var(--text-white)" : "var(--text-secondary)",
              }}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {cat.label} ({counts?.earned ?? 0}/{counts?.total ?? 0})
            </button>
          );
        })}
      </div>

      {/* Achievement cards */}
      <div className="flex flex-col gap-2">
        {activeDefs.map((def) => {
          const isEarned = earnedSet.has(def.id);
          const isHidden = def.hidden && !isEarned;

          if (isHidden) {
            return <HiddenCard key={def.id} />;
          }

          const progress = getAchievementProgress(def, stats);
          const currentValue = stats[def.statKey];

          return (
            <AchievementCard
              key={def.id}
              def={def}
              isEarned={isEarned}
              progress={progress}
              currentValue={currentValue}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Hidden achievement placeholder ─────────────────────────────────────── */

function HiddenCard() {
  return (
    <div
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
      className="rounded-lg border p-3"
    >
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--text-muted)" }} className="text-lg">?</span>
        <div>
          <div
            style={{ color: "var(--text-muted)" }}
            className="text-sm font-semibold"
          >
            ???
          </div>
          <div
            style={{ color: "var(--text-muted)" }}
            className="text-xs italic"
          >
            Hidden Achievement
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Achievement card ───────────────────────────────────────────────────── */

function AchievementCard({
  def,
  isEarned,
  progress,
  currentValue,
}: {
  def: AchievementDefinition;
  isEarned: boolean;
  progress: number;
  currentValue: number;
}) {
  const rewardText = getRewardText(def);

  return (
    <div
      style={{
        background: isEarned ? "var(--accent-bg)" : "var(--panel-bg)",
        borderColor: isEarned ? "var(--accent-border)" : "var(--panel-border)",
      }}
      className="rounded-lg border p-3"
    >
      {/* Top row: icon/check + name */}
      <div className="flex items-start gap-2">
        {isEarned ? (
          <span style={{ color: "var(--success)" }} className="text-base leading-none mt-0.5">
            &#10003;
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }} className="text-base leading-none mt-0.5">
            &#9675;
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{ color: isEarned ? "var(--text-white)" : "var(--text-primary)" }}
              className="text-sm font-semibold"
            >
              {def.name}
            </span>
            {isEarned && def.reward.type === "title" && (
              <span
                style={{
                  color: "var(--accent)",
                  borderColor: "var(--accent-border)",
                }}
                className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              >
                {def.reward.title}
              </span>
            )}
          </div>

          <div
            style={{ color: "var(--text-secondary)" }}
            className="text-xs mt-0.5"
          >
            {def.description}
          </div>

          {/* Flavor text (earned only) */}
          {isEarned && (
            <div
              style={{ color: "var(--text-muted)" }}
              className="text-xs italic mt-1"
            >
              {def.flavorText}
            </div>
          )}

          {/* Bonus reward (prominently displayed) */}
          {rewardText && (
            <div
              style={{
                color: isEarned ? "var(--success)" : "var(--accent)",
                background: isEarned ? undefined : "var(--accent-bg)",
                borderColor: isEarned ? undefined : "var(--accent-border)",
              }}
              className={`text-xs font-semibold mt-1.5 ${
                !isEarned ? "rounded border px-2 py-1 inline-block" : ""
              }`}
            >
              {isEarned ? "Bonus: " : "Reward: "}
              {rewardText}
            </div>
          )}

          {/* Progress bar (unearned only) */}
          {!isEarned && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span
                  style={{ color: "var(--text-muted)" }}
                  className="text-[10px] font-mono"
                >
                  {formatNumber(currentValue)} / {formatNumber(def.target)}
                </span>
                <span
                  style={{ color: "var(--text-muted)" }}
                  className="text-[10px] font-mono"
                >
                  {Math.floor(progress * 100)}%
                </span>
              </div>
              <div
                style={{
                  background: "var(--panel-border)",
                }}
                className="h-1.5 rounded-full overflow-hidden"
              >
                <div
                  style={{
                    background: progress >= 1 ? "var(--success)" : "var(--accent)",
                    width: `${Math.min(100, progress * 100)}%`,
                  }}
                  className="h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getRewardText(def: AchievementDefinition): string | null {
  if (def.reward.type === "bonus") return def.reward.description;
  if (def.reward.type === "title") return null; // displayed as badge
  return null;
}
