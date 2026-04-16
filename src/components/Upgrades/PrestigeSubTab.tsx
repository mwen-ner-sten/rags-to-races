"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import MomentumTracker from "@/components/Shop/MomentumTracker";
import PrestigeMilestoneTrack from "./PrestigeMilestoneTrack";
import PrestigeConfirm from "@/components/Shop/PrestigeConfirm";

export default function PrestigeSubTab() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const lifetimeScrapBucks = useGameStore((s) => s.lifetimeScrapBucks);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const prestigeBonus = useGameStore((s) => s.prestigeBonus);
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const garage = useGameStore((s) => s.garage);
  const inventory = useGameStore((s) => s.inventory);
  const fatigue = useGameStore((s) => s.fatigue);
  const sellAllJunk = useGameStore((s) => s.sellAllJunk);
  const prestige = useGameStore((s) => s.prestige);
  const lifetimeLPAllTime = useGameStore((s) => s.lifetimeLPAllTime);
  const lifetimeScrapResets = useGameStore((s) => s.lifetimeScrapResets);
  const teamEraCount = useGameStore((s) => s.teamEraCount);
  const lifetimeTeamPoints = useGameStore((s) => s.lifetimeTeamPoints);
  const ownerEraCount = useGameStore((s) => s.ownerEraCount);
  const lifetimeOwnerPoints = useGameStore((s) => s.lifetimeOwnerPoints);
  const trackEraCount = useGameStore((s) => s.trackEraCount);
  const teamReset = useGameStore((s) => s.teamReset);
  const ownerReset = useGameStore((s) => s.ownerReset);
  const trackReset = useGameStore((s) => s.trackReset);

  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);

  const canPrestige = garage.length >= 3 && repPoints >= 5000 && lifetimeScrapBucks >= 50000;

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
                <StatRow label="Scrap Multiplier" value={`\u00d7${prestigeBonus.scrapMultiplier.toFixed(1)}`} accent />
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
              Requirements: 3 vehicles built, 5,000 Rep, $50,000 lifetime Scrap Bucks
            </p>
          )}
          <button
            data-tutorial="prestige-btn"
            onClick={() => setShowPrestigeConfirm(true)}
            disabled={!canPrestige}
            style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Scrap Reset
          </button>
        </div>
      )}

      {/* Team Reset */}
      {lifetimeLPAllTime >= 200 && (
        <div
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#128101; Team Reset (Era {teamEraCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Disband your team and rebuild. Resets LP, legacy upgrades, talent nodes, loot gear, materials.
            Keeps Team Points, Team upgrades, standard gear, and challenges.
          </p>
          <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
            Requires 200 lifetime LP (you have {lifetimeLPAllTime})
          </p>
          <button
            onClick={teamReset}
            disabled={lifetimeLPAllTime < 200}
            style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Team Reset
          </button>
        </div>
      )}

      {/* Owner Reset */}
      {lifetimeTeamPoints >= 500 && ownerEraCount >= 0 && teamEraCount >= 3 && (
        <div
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#127942; Owner Reset (Era {ownerEraCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Step into the owner&apos;s box. Resets everything from Team Reset + TP and Team upgrades.
            Keeps Owner Points, Owner upgrades, and permanent unlocks.
          </p>
          <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
            Requires 500 lifetime TP + 3 team eras (you have {lifetimeTeamPoints} TP, {teamEraCount} eras)
          </p>
          <button
            onClick={ownerReset}
            disabled={lifetimeTeamPoints < 500 || teamEraCount < 3}
            style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Owner Reset
          </button>
        </div>
      )}

      {/* Track Reset */}
      {lifetimeOwnerPoints >= 1000 && ownerEraCount >= 5 && (
        <div
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
          className="rounded-lg border p-4"
        >
          <div style={{ color: "var(--text-white)" }} className="font-semibold mb-1">
            &#127939; Track Reset (Era {trackEraCount + 1})
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
            Buy the track. Resets everything from Owner Reset + OP and Owner upgrades.
            Keeps Prestige Tokens, Track Perks, and all permanent unlocks.
          </p>
          <p style={{ color: "var(--text-muted)" }} className="mb-3 text-xs">
            Requires 1000 lifetime OP + 5 owner eras (you have {lifetimeOwnerPoints} OP, {ownerEraCount} eras)
          </p>
          <button
            onClick={trackReset}
            disabled={lifetimeOwnerPoints < 1000 || ownerEraCount < 5}
            style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Track Reset
          </button>
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
