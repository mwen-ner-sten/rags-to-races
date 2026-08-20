"use client";

import { useGameStore } from "@/state/store";
import {
  CREW_ROLE_LABELS,
  CREW_ROLE_DESCRIPTIONS,
  CREW_SPECIALIZATIONS,
  CREW_ROLES,
  getSpecializationsForRole,
} from "@/data/crew";
import GameAssetImage from "@/components/GameAssetImage";
import { crewLevelFromXp } from "@/engine/crew";
import { TEAM_PHILOSOPHIES_BY_ID } from "@/data/teamPhilosophies";

export default function CrewPanel() {
  const crewRoster = useGameStore((s) => s.crewRoster);
  const specializeCrewMember = useGameStore((s) => s.specializeCrewMember);
  const recruitCrewMember = useGameStore((s) => s.recruitCrewMember);
  const crewSlots = useGameStore((s) => s.crewSlots);
  const teamPoints = useGameStore((s) => s.teamPoints);
  const philosophyId = useGameStore((s) => s.teamOperatingPhilosophy);
  const departmentHead = philosophyId
    ? crewRoster
        .filter((member) => member.role === TEAM_PHILOSOPHIES_BY_ID[philosophyId].leadRole)
        .reduce<(typeof crewRoster)[number] | null>(
          (best, member) => best === null || member.xp > best.xp ? member : best,
          null,
        )
    : null;

  return (
    <div className="flex flex-col gap-4">
      <h2
        style={{ color: "var(--text-heading)" }}
        className="text-sm font-semibold uppercase tracking-widest"
      >
        Crew Roster
      </h2>

      <div className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <div className="flex items-center justify-between"><span className="text-xs" style={{ color: "var(--text-muted)" }}>Recruitment · {crewRoster.length}/{crewSlots} slots</span><span className="text-xs" style={{ color: "var(--accent)" }}>1 TP each</span></div>
        <div className="mt-2 flex flex-wrap gap-2">{CREW_ROLES.map((role) => <button key={role} onClick={() => recruitCrewMember(role)} disabled={teamPoints < 1 || crewRoster.length >= crewSlots} className="inline-flex items-center gap-2 rounded border px-2 py-1.5 text-xs disabled:opacity-40" style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}><GameAssetImage kind="crew_role" id={role} width={28} height={28} className="rounded-full" />{CREW_ROLE_LABELS[role]}</button>)}</div>
      </div>

      {crewRoster.length === 0 && <p className="py-4 text-center text-sm" style={{ color: "var(--text-dim)" }}>Recruit a role to begin developing the team.</p>}

      <div className="grid gap-3">
        {crewRoster.map((member) => {
          const { level, xpIntoLevel, xpForNext } = crewLevelFromXp(member.xp);
          const pct =
            xpForNext > 0 ? (xpIntoLevel / xpForNext) * 100 : 100;
          const isMaxLevel = level >= 10;
          const canSpecialize = level >= 5;
          const availableSpecs = getSpecializationsForRole(member.role);
          const currentSpec = member.specialization
            ? CREW_SPECIALIZATIONS.find((s) => s.id === member.specialization)
            : null;

          return (
            <div
              key={member.id}
              style={{
                background: "var(--panel-bg)",
                borderColor: "var(--panel-border)",
              }}
              className="rounded-lg border p-3"
            >
              {/* Header: role icon, name, level */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GameAssetImage kind="crew_role" id={member.role} width={48} height={48} className="rounded-full" />
                  <div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-heading)" }}
                    >
                      {member.name}
                    </span>
                    {departmentHead?.id === member.id && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                        Department Head
                      </span>
                    )}
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {CREW_ROLE_LABELS[member.role]}
                    </span>
                  </div>
                </div>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  Lv {level}
                </span>
              </div>

              {/* Role description */}
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {CREW_ROLE_DESCRIPTIONS[member.role]}
              </p>
              {currentSpec && (
                <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <GameAssetImage kind="crew_specialization" id={currentSpec.id} width={32} height={32} />
                  <span>{currentSpec.name}</span>
                </div>
              )}

              {/* XP bar */}
              <div className="mt-2">
                <div
                  className="flex justify-between text-xs"
                  style={{ color: "var(--text-dim)" }}
                >
                  <span>XP</span>
                  <span>
                    {isMaxLevel
                      ? "MAX"
                      : `${formatCrewXp(xpIntoLevel)} / ${xpForNext}`}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full"
                  style={{ background: "var(--panel-border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: isMaxLevel
                        ? "var(--success)"
                        : "var(--accent)",
                    }}
                  />
                </div>
              </div>

              {/* Current bonuses */}
              <div
                className="mt-2 font-mono text-xs"
                style={{ color: "var(--accent)" }}
              >
                {formatRoleBonuses(member.role, level)}
              </div>

              {/* Specialization */}
              {canSpecialize && (
                <div className="mt-2">
                  {currentSpec ? (
                    <div
                      className="rounded border px-2 py-1 text-xs"
                      style={{
                        background: "var(--accent-bg)",
                        borderColor: "var(--accent-border)",
                      }}
                    >
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text-heading)" }}
                      >
                        {currentSpec.name}
                      </span>
                      <span
                        className="ml-2"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {currentSpec.bonusDescription}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {availableSpecs.map((spec) => (
                        <button
                          key={spec.id}
                          onClick={() =>
                            specializeCrewMember(member.id, spec.id)
                          }
                          title={spec.description}
                          style={{
                            background: "var(--accent)",
                            color: "var(--panel-bg)",
                          }}
                          className="rounded px-2 py-1 text-xs font-semibold transition-opacity hover:opacity-90"
                        >
                          {spec.name}
                          <span className="ml-1 opacity-75">
                            ({spec.bonusDescription})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!canSpecialize && level < 10 && (
                <p
                  className="mt-2 text-xs italic"
                  style={{ color: "var(--text-dim)" }}
                >
                  Specialization unlocks at level 5
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCrewXp(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRoleBonuses(role: string, level: number): string {
  switch (role) {
    case "scout":
      return `+${level}% scavenge luck, +${level * 2}% scavenge yield`;
    case "mechanic":
      return `-${level}% build cost, -${(level * 1.5).toFixed(1)}% repair cost`;
    case "driver":
      return `+${level}% race performance, -${(level * 0.5).toFixed(1)}% DNF`;
    case "trader":
      return `+${level * 2}% sell value, -${level}% dealer prices`;
    default:
      return "";
  }
}
