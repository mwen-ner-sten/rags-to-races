"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import LegacyShop from "./LegacyShop";
import MomentumTracker from "./MomentumTracker";
import PrestigeConfirm from "./PrestigeConfirm";

export default function ShopPanel() {
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

  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);

  const canPrestige = garage.length >= 1 && repPoints >= 25 && lifetimeScrapBucks >= 500;

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left column: Stats + Prestige + Momentum */}
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

        {/* Current bonuses */}
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

        {/* Momentum Tracker */}
        <MomentumTracker />

        {/* Actions */}
        <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-semibold uppercase tracking-widest">
          Actions
        </h2>

        {/* Quick sell */}
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

        {/* Prestige */}
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
                Requirements: 1 vehicle built, 25 Rep, $500 lifetime Scrap Bucks
              </p>
            )}
            <button
              onClick={() => setShowPrestigeConfirm(true)}
              disabled={!canPrestige}
              style={{ background: "var(--accent)", color: "var(--btn-primary-text)" }}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Scrap Reset
            </button>
          </div>
        )}
      </div>

      {/* Right column: Legacy Shop */}
      <div className="flex flex-col gap-4">
        <LegacyShop />
      </div>
    </div>

    </>
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
