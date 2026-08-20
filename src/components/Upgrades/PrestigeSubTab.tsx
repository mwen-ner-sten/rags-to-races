"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import MomentumTracker from "@/components/Shop/MomentumTracker";
import PrestigeMilestoneTrack from "./PrestigeMilestoneTrack";
import PrestigeConfirm from "@/components/Shop/PrestigeConfirm";
import { canOwnerReset, canScrapReset, canTeamReset, canTrackReset, RESPONSIBILITY_RESET_REQUIREMENTS, scrapResetRequirementText } from "@/config/progression";
import { calculateOwnerPoints, calculateTeamPoints, calculateTrackTokens } from "@/engine/prestige";
import { CREW_ROLE_LABELS, getSpecializationsForRole } from "@/data/crew";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_OPERATING_PHILOSOPHY_IDS, TEAM_PHILOSOPHIES, type TeamOperatingPhilosophy } from "@/data/teamPhilosophies";

type ResponsibilityResetLayer = "team" | "owner" | "track";

export default function PrestigeSubTab() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const prestigeBonus = useGameStore((s) => s.prestigeBonus);
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const lifetimeLPThisTeamEra = useGameStore((s) => s.lifetimeLPThisTeamEra);
  const garage = useGameStore((s) => s.garage);
  const inventory = useGameStore((s) => s.inventory);
  const fatigue = useGameStore((s) => s.fatigue);
  const sellAllJunk = useGameStore((s) => s.sellAllJunk);
  const prestige = useGameStore((s) => s.prestige);
  const lifetimeLPAllTime = useGameStore((s) => s.lifetimeLPAllTime);
  const lifetimeScrapResets = useGameStore((s) => s.lifetimeScrapResets);
  const teamEraCount = useGameStore((s) => s.teamEraCount);
  const teamPoints = useGameStore((s) => s.teamPoints);
  const lifetimeTeamPoints = useGameStore((s) => s.lifetimeTeamPoints);
  const lifetimeTPThisOwnerEra = useGameStore((s) => s.lifetimeTPThisOwnerEra);
  const ownerEraCount = useGameStore((s) => s.ownerEraCount);
  const ownerPoints = useGameStore((s) => s.ownerPoints);
  const lifetimeOwnerPoints = useGameStore((s) => s.lifetimeOwnerPoints);
  const lifetimeOPThisTrackEra = useGameStore((s) => s.lifetimeOPThisTrackEra);
  const trackEraCount = useGameStore((s) => s.trackEraCount);
  const trackPrestigeTokens = useGameStore((s) => s.trackPrestigeTokens);
  const teamReset = useGameStore((s) => s.teamReset);
  const ownerReset = useGameStore((s) => s.ownerReset);
  const trackReset = useGameStore((s) => s.trackReset);

  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);
  const [confirmingResponsibilityReset, setConfirmingResponsibilityReset] = useState<ResponsibilityResetLayer | null>(null);

  const canPrestige = canScrapReset({ vehiclesBuilt: garage.length, reputation: repPoints, lifetimeScrapBucks });
  const canTeam = canTeamReset({ lifetimeLegacyPoints: lifetimeLPAllTime, lifetimeLPThisTeamEra, unspentLegacyPoints: legacyPoints });
  const canOwner = canOwnerReset({ lifetimeTeamPoints, teamEras: teamEraCount, lifetimeTPThisOwnerEra, unspentTeamPoints: teamPoints });
  const canTrack = canTrackReset({ lifetimeOwnerPoints, ownerEras: ownerEraCount, lifetimeOPThisTrackEra, unspentOwnerPoints: ownerPoints });
  const teamPointAward = calculateTeamPoints({ lifetimeLPThisTeamEra, teamEraCount, unspentLP: legacyPoints });
  const ownerPointAward = calculateOwnerPoints({ lifetimeTPThisOwnerEra, ownerEraCount, unspentTP: teamPoints });
  const trackTokenAward = calculateTrackTokens({ lifetimeOPThisTrackEra, trackEraCount, unspentOP: ownerPoints });

  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
        Stats
      </h2>
      <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <StatRow label="Scrap Bucks" value={`$${formatNumber(scrapBucks)}`} />
          <StatRow label="Rep Points" value={formatNumber(repPoints)} />
          <StatRow label="Lifetime Scrap" value={`$${formatNumber(lifetimeScrapBucks)}`} />
          <StatRow label="Vehicles Built" value={String(garage.length)} />
          <StatRow label="Parts in Inventory" value={String(inventory.length)} />
          <StatRow label="Prestige Count" value={String(prestigeCount)} />
          <StatRow label="Legacy Points" value={`${legacyPoints} LP`} accent />
        </div>
      </div>

      {(prestigeBonus.scrapMultiplier > 1 || prestigeBonus.luckBonus > 0 || prestigeBonus.repMultiplier > 1) && (
        <>
          <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
            Legacy Bonuses (Active)
          </h2>
          <div style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }} className="rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {prestigeBonus.scrapMultiplier > 1 && (
                <StatRow label="Race Scrap Multiplier" value={`\u00d7${prestigeBonus.scrapMultiplier.toFixed(1)}`} accent />
              )}
              {prestigeBonus.luckBonus > 0 && (
                <StatRow label="Luck Bonus" value={`+${(prestigeBonus.luckBonus * 100).toFixed(0)}%`} accent />
              )}
              {prestigeBonus.repMultiplier > 1 && (
                <StatRow label="Rep Multiplier" value={`\u00d7${prestigeBonus.repMultiplier.toFixed(1)}`} accent />
              )}
            </div>
          </div>
        </>
      )}

      <PrestigeMilestoneTrack />

      <MomentumTracker />

      <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
        Actions
      </h2>

      <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-4">
        <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">Quick Sell</div>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
          {inventory.length} parts in inventory. Sell them all for instant Scrap Bucks.
        </p>
        <button
          onClick={sellAllJunk}
          disabled={inventory.length === 0}
          style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
          className="rounded-lg border px-4 py-2 text-sm transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sell All Parts
        </button>
      </div>

      {showPrestigeConfirm ? (
        <PrestigeConfirm
          onConfirm={() => {
            prestige();
            setShowPrestigeConfirm(false);
          }}
          onCancel={() => setShowPrestigeConfirm(false)}
        />
      ) : (
        <div
          style={{
            background: canPrestige ? "var(--accent-bg)" : "var(--panel-bg)",
            borderColor: canPrestige ? "var(--accent-border)" : "var(--panel-border)",
          }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#128260; Scrap Reset (Prestige {prestigeCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Reset everything but keep permanent bonuses. Earn Legacy Points to buy permanent upgrades.
          </p>
          {fatigue > 25 && (
            <p style={{ color: fatigue > 75 ? "var(--danger)" : fatigue > 50 ? "var(--warning)" : "var(--text-secondary)" }} className="text-sm mb-3 italic">
              {fatigue > 75
                ? "Your mechanic can barely keep their eyes open. A fresh start would do wonders."
                : fatigue > 50
                  ? "Exhaustion is taking its toll. Consider a fresh start."
                  : "Your mechanic is getting tired..."}
            </p>
          )}
          {!canPrestige && (
            <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
              Requirements: {scrapResetRequirementText()}
            </p>
          )}
          <button
            data-tutorial="prestige-btn"
            onClick={() => setShowPrestigeConfirm(true)}
            disabled={!canPrestige}
            style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
            className="min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-opacity active:scale-[.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto sm:active:scale-100"
          >
            Scrap Reset
          </button>
        </div>
      )}

      {/* Team Reset */}
      {canTeam && (
        <div
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#128101; Team Reset (Era {teamEraCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Disband your team and rebuild. Clears Scrap/Legacy progress, vehicles, fleet assignments,
            non-lead crew, and station equipment. Keeps your selected department head, mastered automation,
            Team Points, Team upgrades, blueprints, and achievements.
          </p>
          <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
            Requires {RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints} lifetime LP (you have {lifetimeLPAllTime})
          </p>
          <p style={{ color: "var(--accent)" }} className="mb-3 font-mono text-sm font-semibold">
            Award: +{teamPointAward} TP · Total after reset: {teamPoints + teamPointAward} TP
          </p>
          {confirmingResponsibilityReset === "team" ? (
            <ResponsibilityResetConfirm
              layerName="Team"
              award={`+${teamPointAward} TP`}
              resetText="Scrap and Legacy progress, vehicles, fleet assignments, non-lead crew, and station equipment"
              keepText="Your selected department head, Auto-Scavenge, Auto-Race, Team Points and upgrades, discovered blueprints, achievements, and lifetime history"
              onConfirm={(philosophy) => {
                setConfirmingResponsibilityReset(null);
                if (philosophy) teamReset(philosophy);
              }}
              onCancel={() => setConfirmingResponsibilityReset(null)}
            />
          ) : (
            <button
              onClick={() => setConfirmingResponsibilityReset("team")}
              disabled={!canTeam}
              style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
              className="min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-opacity active:scale-[.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto sm:active:scale-100"
            >
              Team Reset
            </button>
          )}
        </div>
      )}

      {/* Owner Reset */}
      {canOwner && (
        <div
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#127942; Owner Reset (Era {ownerEraCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Step into the owner&apos;s box. Clears Team and lower-layer progress.
            Keeps Owner Points, Owner facilities, permanent discoveries, achievements, and lifetime history.
          </p>
          <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
            Requires {RESPONSIBILITY_RESET_REQUIREMENTS.owner.lifetimeTeamPoints} lifetime TP + {RESPONSIBILITY_RESET_REQUIREMENTS.owner.teamEras} team eras (you have {lifetimeTeamPoints} TP, {teamEraCount} eras)
          </p>
          <p style={{ color: "var(--accent)" }} className="mb-3 font-mono text-sm font-semibold">
            Award: +{ownerPointAward} OP · Total after reset: {ownerPoints + ownerPointAward} OP
          </p>
          {confirmingResponsibilityReset === "owner" ? (
            <ResponsibilityResetConfirm
              layerName="Owner"
              award={`+${ownerPointAward} OP`}
              resetText="Team, Legacy, and Scrap progress, vehicles, crew, fleet assignments, and station equipment"
              keepText="Owner Points and facilities, discoveries, achievements, and lifetime history"
              onConfirm={() => {
                setConfirmingResponsibilityReset(null);
                ownerReset();
              }}
              onCancel={() => setConfirmingResponsibilityReset(null)}
            />
          ) : (
            <button
              onClick={() => setConfirmingResponsibilityReset("owner")}
              disabled={!canOwner}
              style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
              className="min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-opacity active:scale-[.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto sm:active:scale-100"
            >
              Owner Reset
            </button>
          )}
        </div>
      )}

      {/* Track Reset */}
      {canTrack && (
        <div
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#127939; Track Reset (Era {trackEraCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Buy the track. Clears Owner and lower-layer progress.
            Keeps Prestige Tokens, Track perks, owned venue configuration, discoveries, achievements, and lifetime history.
          </p>
          <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
            Requires {RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints} lifetime OP + {RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras} owner eras (you have {lifetimeOwnerPoints} OP, {ownerEraCount} eras)
          </p>
          <p style={{ color: "var(--accent)" }} className="mb-3 font-mono text-sm font-semibold">
            Award: +{trackTokenAward} PT · Total after reset: {trackPrestigeTokens + trackTokenAward} PT
          </p>
          {confirmingResponsibilityReset === "track" ? (
            <ResponsibilityResetConfirm
              layerName="Track"
              award={`+${trackTokenAward} PT`}
              resetText="Owner, Team, Legacy, and Scrap progress, vehicles, crew, fleet assignments, and station equipment"
              keepText="Prestige Tokens and Track perks, owned venue configuration, discoveries, achievements, and lifetime history"
              onConfirm={() => {
                setConfirmingResponsibilityReset(null);
                trackReset();
              }}
              onCancel={() => setConfirmingResponsibilityReset(null)}
            />
          ) : (
            <button
              onClick={() => setConfirmingResponsibilityReset("track")}
              disabled={!canTrack}
              style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
              className="min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-opacity active:scale-[.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:w-auto sm:active:scale-100"
            >
              Track Reset
            </button>
          )}
        </div>
      )}

      {/* Lifetime Stats */}
      {lifetimeScrapResets > 0 && (
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-4">
          <h3 style={{ color: "var(--text-heading)" }} className="text-xs font-semibold uppercase tracking-widest mb-2">Lifetime Stats</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <StatRow label="Total Scrap Resets" value={String(lifetimeScrapResets)} />
            <StatRow label="Lifetime LP" value={String(lifetimeLPAllTime)} />
            {teamEraCount > 0 && <StatRow label="Team Eras" value={String(teamEraCount)} />}
            {teamEraCount > 0 && <StatRow label="Lifetime TP" value={String(lifetimeTeamPoints)} />}
            {ownerEraCount > 0 && <StatRow label="Owner Eras" value={String(ownerEraCount)} />}
            {ownerEraCount > 0 && <StatRow label="Lifetime OP" value={String(lifetimeOwnerPoints)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ResponsibilityResetConfirm({
  layerName,
  award,
  resetText,
  keepText,
  onConfirm,
  onCancel,
}: {
  layerName: "Team" | "Owner" | "Track";
  award: string;
  resetText: string;
  keepText: string;
  onConfirm: (philosophy?: TeamOperatingPhilosophy) => void;
  onCancel: () => void;
}) {
  const [selectedPhilosophy, setSelectedPhilosophy] = useState<TeamOperatingPhilosophy | null>(null);
  const crewRoster = useGameStore((s) => s.crewRoster);
  const ownerUpgradeLevels = useGameStore((s) => s.ownerUpgradeLevels);
  const startingLevel = Math.max(1, getGameEffectValue(
    OWNER_UPGRADE_DEFINITIONS,
    ownerUpgradeLevels,
    "crew_starting_level",
  ));

  return (
    <div
      role="alertdialog"
      aria-labelledby={`${layerName.toLowerCase()}-reset-confirm-title`}
      style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
      className="rounded-lg border p-3"
    >
      <h3 id={`${layerName.toLowerCase()}-reset-confirm-title`} style={{ color: "var(--text-heading)" }} className="text-sm font-bold">
        Confirm {layerName} Reset
      </h3>
      <p style={{ color: "var(--accent)" }} className="mt-1 font-mono text-sm font-semibold">
        You will receive {award}.
      </p>
      <p style={{ color: "var(--text-secondary)" }} className="mt-2 text-xs">
        <strong>Will reset:</strong> {resetText}.
      </p>
      <p style={{ color: "var(--text-secondary)" }} className="mt-1 text-xs">
        <strong>Will keep:</strong> {keepText}.
      </p>
      {layerName === "Team" && (
        <fieldset className="mt-3">
          <legend style={{ color: "var(--text-heading)" }} className="text-sm font-semibold">
            Team Operating Philosophy
          </legend>
          <p style={{ color: "var(--text-muted)" }} className="mt-1 text-xs">
            Choose the department head who defines this Team era. This costs no TP and changes only at your next Team Reset.
          </p>
          <div data-testid="team-philosophy-grid" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TEAM_PHILOSOPHIES.map((philosophy) => {
              const retained = crewRoster
                .filter((member) => member.role === philosophy.leadRole)
                .reduce<(typeof crewRoster)[number] | null>(
                  (best, member) => best === null || member.xp > best.xp ? member : best,
                  null,
                );
              const specializations = getSpecializationsForRole(philosophy.leadRole).map((specialization) => specialization.name).join(" or ");
              return (
                <label
                  key={philosophy.id}
                  style={{
                    borderColor: selectedPhilosophy === philosophy.id ? "var(--accent)" : "var(--panel-border)",
                    background: selectedPhilosophy === philosophy.id ? "var(--panel-bg)" : "transparent",
                  }}
                  className="cursor-pointer rounded-lg border p-3 text-xs"
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="team-operating-philosophy"
                      value={philosophy.id}
                      checked={selectedPhilosophy === philosophy.id}
                      onChange={() => setSelectedPhilosophy(philosophy.id)}
                    />
                    <span>
                      <strong style={{ color: "var(--text-heading)" }} className="block text-sm">{philosophy.name}</strong>
                      <span style={{ color: "var(--accent)" }} className="mt-1 block">{CREW_ROLE_LABELS[philosophy.leadRole]} lead · {philosophy.laborDelegated}</span>
                    </span>
                  </span>
                  <span style={{ color: "var(--text-secondary)" }} className="mt-2 block">
                    Specialization paths: <span>{specializations}</span>
                  </span>
                  <span style={{ color: "var(--warning)" }} className="mt-1 block">Lost expertise: {philosophy.lostExpertise}</span>
                  <span style={{ color: "var(--text-white)" }} className="mt-1 block font-semibold">
                    {retained
                      ? `Retains ${retained.name} · ${CREW_ROLE_LABELS[retained.role]} Lv.${retained.level}`
                      : `Hires a new level-${startingLevel} ${CREW_ROLE_LABELS[philosophy.leadRole]} lead`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onConfirm(selectedPhilosophy ?? undefined)}
          disabled={layerName === "Team" && !TEAM_OPERATING_PHILOSOPHY_IDS.some((id) => id === selectedPhilosophy)}
          style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
          className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm {layerName} Reset ({award})
        </button>
        <button
          onClick={onCancel}
          style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
          className="rounded-lg border px-4 py-2 text-sm transition-opacity hover:opacity-80"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: accent ? "var(--accent)" : "var(--text-white)" }} className="font-mono font-semibold">{value}</span>
    </>
  );
}
