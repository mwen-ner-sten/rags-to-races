"use client";

import { useGameStore } from "@/state/store";
import { SKILL_DEFINITIONS, xpForLevel, levelFromXp, ratingForLevel, ratingToEffectiveness } from "@/data/racerSkills";
import type { SkillName } from "@/data/racerSkills";
import { getCircuitById } from "@/data/circuits";

export default function SkillsSubTab() {
  const racerSkills = useGameStore((s) => s.racerSkills);
  const selectedCircuitId = useGameStore((s) => s.selectedCircuitId);
  const circuit = getCircuitById(selectedCircuitId);
  const tier = circuit?.tier ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <h2
        style={{ color: "var(--text-heading)" }}
        className="text-sm font-semibold uppercase tracking-widest"
      >
        Racer Skills
      </h2>
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        Earn XP by racing, scavenging, and building. Rating effectiveness scales
        with circuit tier. Skills reset on Scrap Reset.
      </p>

      <div className="grid gap-3">
        {SKILL_DEFINITIONS.map((def) => {
          const skill = racerSkills[def.id as SkillName];
          const { level, xpIntoLevel, xpForNext } = levelFromXp(skill.xp);
          const rating = ratingForLevel(level);
          const effectiveness = ratingToEffectiveness(rating, tier);
          const pct = xpForNext > 0 ? (xpIntoLevel / xpForNext) * 100 : 100;

          return (
            <div
              key={def.id}
              style={{
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
              }}
              className="rounded-lg border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{def.icon}</span>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      {def.name}
                    </span>
                    <span className="ml-2 text-xs font-bold" style={{ color: "var(--accent)" }}>
                      Lv {level}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
                    Rating: {rating}
                  </div>
                  <div className="text-xs font-mono" style={{ color: effectiveness > 0.3 ? "var(--success)" : effectiveness > 0.15 ? "var(--warning)" : "var(--text-dim)" }}>
                    T{tier} Eff: {(effectiveness * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* XP bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
                  <span>{def.bonusDescription}</span>
                  <span>
                    {xpForNext > 0
                      ? `${xpIntoLevel} / ${xpForNext} XP`
                      : "MAX"}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--panel-border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>

              <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                {def.description}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-lg border p-3 text-xs"
        style={{
          background: "var(--accent-bg)",
          borderColor: "var(--accent-border)",
          color: "var(--text-dim)",
        }}
      >
        <strong style={{ color: "var(--text-heading)" }}>Rating System:</strong>{" "}
        Each skill level gives +5 Rating. Rating converts to effectiveness via{" "}
        <code className="text-xs">rating / (rating + tierConstant)</code>.
        Higher-tier circuits need more rating to maintain the same effectiveness.
      </div>
    </div>
  );
}
