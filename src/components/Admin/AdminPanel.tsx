"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { PART_DEFINITIONS, CONDITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { formatNumber } from "@/utils/format";
import type { PartCondition } from "@/data/parts";

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";
const ENV_LABEL = VERCEL_ENV === "production" ? "PROD" : VERCEL_ENV === "preview" ? "PREVIEW" : "DEV";

const SECTION = "rounded-lg border p-4 flex flex-col gap-3";
const LABEL = "text-xs font-semibold uppercase tracking-wider mb-1";

const QUICK_SCRAP = [100, 1_000, 10_000, 100_000];
const QUICK_REP = [5, 10, 50, 100];

const PART_CATEGORIES = ["engine", "wheel", "frame", "fuel"] as const;

export default function AdminPanel() {
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const inventory = useGameStore((s) => s.inventory);
  const garage = useGameStore((s) => s.garage);
  const unlockedLocationIds = useGameStore((s) => s.unlockedLocationIds);
  const unlockedCircuitIds = useGameStore((s) => s.unlockedCircuitIds);
  const unlockedVehicleIds = useGameStore((s) => s.unlockedVehicleIds);
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);
  const autoRaceUnlocked = useGameStore((s) => s.autoRaceUnlocked);

  const devSetScrapBucks = useGameStore((s) => s.devSetScrapBucks);
  const devAddScrapBucks = useGameStore((s) => s.devAddScrapBucks);
  const devSetRepPoints = useGameStore((s) => s.devSetRepPoints);
  const devAddRepPoints = useGameStore((s) => s.devAddRepPoints);
  const devSetPrestigeCount = useGameStore((s) => s.devSetPrestigeCount);
  const devUnlockAll = useGameStore((s) => s.devUnlockAll);
  const devLockAll = useGameStore((s) => s.devLockAll);
  const devAddPartsToInventory = useGameStore((s) => s.devAddPartsToInventory);
  const devClearInventory = useGameStore((s) => s.devClearInventory);
  const devClearGarage = useGameStore((s) => s.devClearGarage);
  const devSetAutoUnlocks = useGameStore((s) => s.devSetAutoUnlocks);
  const devScavengeMultiplier = useGameStore((s) => s.devScavengeMultiplier);
  const devSetScavengeMultiplier = useGameStore((s) => s.devSetScavengeMultiplier);
  const devResetSave = useGameStore((s) => s.devResetSave);

  const [scrapInput, setScrapInput] = useState("");
  const [repInput, setRepInput] = useState("");
  const [prestigeInput, setPrestigeInput] = useState(String(prestigeCount));
  const [partCategory, setPartCategory] = useState<(typeof PART_CATEGORIES)[number]>("engine");
  const [partId, setPartId] = useState("");
  const [partCondition, setPartCondition] = useState<PartCondition>("good");
  const [partCount, setPartCount] = useState("1");
  const [addLog, setAddLog] = useState<string[]>([]);

  function log(msg: string) {
    setAddLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  }

  const filteredParts = PART_DEFINITIONS.filter((p) => p.category === partCategory);
  const selectedPartDef = PART_DEFINITIONS.find((p) => p.id === partId) ?? filteredParts[0];

  function handleAddParts() {
    const defId = partId || filteredParts[0]?.id;
    if (!defId) return;
    const count = Math.max(1, parseInt(partCount) || 1);
    devAddPartsToInventory([defId], partCondition, count);
    const def = PART_DEFINITIONS.find((p) => p.id === defId);
    log(`Added ${count}\u00d7 ${def?.name ?? defId} (${partCondition})`);
  }

  function handleAddAllParts() {
    const ids = filteredParts.map((p) => p.id);
    devAddPartsToInventory(ids, partCondition, 1);
    log(`Added all ${filteredParts.length} ${partCategory} parts (${partCondition})`);
  }

  function handleAddOneOfEverything() {
    const ids = PART_DEFINITIONS.map((p) => p.id);
    devAddPartsToInventory(ids, partCondition, 1);
    log(`Added 1\u00d7 every part (${partCondition}) \u2014 ${ids.length} total`);
  }

  // Reusable button styles using CSS vars
  const btnPrimary = { background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" };
  const btnOutline = { borderColor: "var(--btn-border)", color: "var(--text-primary)" };
  const btnDanger = { background: "var(--danger)", color: "var(--btn-primary-text)" };
  const btnAccent = { background: "var(--accent)", color: "var(--btn-primary-text)" };

  return (
    <div className="flex flex-col gap-2">
      {/* Banner */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono font-semibold rounded px-1.5 py-0.5"
            style={{
              background: ENV_LABEL === "PROD" ? "var(--danger)" : ENV_LABEL === "PREVIEW" ? "var(--accent-bg)" : "var(--success)",
              color: ENV_LABEL === "PROD" ? "var(--btn-primary-text)" : ENV_LABEL === "PREVIEW" ? "var(--accent)" : "var(--btn-primary-text)",
              border: ENV_LABEL === "PREVIEW" ? "1px solid var(--accent-border)" : undefined,
            }}
          >
            {ENV_LABEL}
          </span>
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            v{BUILD_VERSION}
          </span>
        </div>
      </div>

      {/* Version info */}
      <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border px-4 py-2 flex items-center justify-between">
        <span style={{ color: "var(--text-muted)" }} className="text-xs uppercase tracking-wider">Build Version</span>
        <span style={{ color: "var(--accent)" }} className="text-xs font-mono font-semibold">v{BUILD_VERSION}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Currency */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION}>
          <p style={{ color: "var(--text-heading)" }} className={LABEL}>Currency</p>

          <div className="flex flex-col gap-1.5">
            <span style={{ color: "var(--text-muted)" }} className="text-xs">
              Scrap Bucks: <span style={{ color: "var(--success)" }} className="font-mono">${formatNumber(scrapBucks)}</span>
            </span>
            <div className="flex gap-1 flex-wrap">
              {QUICK_SCRAP.map((n) => (
                <button key={n} onClick={() => { devAddScrapBucks(n); log(`+$${formatNumber(n)} Scrap Bucks`); }} style={btnOutline} className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80">
                  +${formatNumber(n)}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
                className="rounded border px-2 py-1 text-sm w-28 focus:outline-none"
                placeholder="Set to..."
                value={scrapInput}
                onChange={(e) => setScrapInput(e.target.value)}
              />
              <button
                onClick={() => { const v = parseFloat(scrapInput); if (!isNaN(v)) { devSetScrapBucks(v); log(`Set Scrap Bucks = $${formatNumber(v)}`); setScrapInput(""); } }}
                style={btnPrimary}
                className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                Set
              </button>
            </div>
          </div>

          <div style={{ borderColor: "var(--divider)" }} className="flex flex-col gap-1.5 pt-2 border-t">
            <span style={{ color: "var(--text-muted)" }} className="text-xs">
              Rep Points: <span style={{ color: "var(--info)" }} className="font-mono">{formatNumber(repPoints)}</span>
            </span>
            <div className="flex gap-1 flex-wrap">
              {QUICK_REP.map((n) => (
                <button key={n} onClick={() => { devAddRepPoints(n); log(`+${n} Rep`); }} style={btnOutline} className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80">
                  +{n} Rep
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
                className="rounded border px-2 py-1 text-sm w-28 focus:outline-none"
                placeholder="Set to..."
                value={repInput}
                onChange={(e) => setRepInput(e.target.value)}
              />
              <button
                onClick={() => { const v = parseFloat(repInput); if (!isNaN(v)) { devSetRepPoints(v); log(`Set Rep = ${formatNumber(v)}`); setRepInput(""); } }}
                style={btnPrimary}
                className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Unlocks */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION}>
          <p style={{ color: "var(--text-heading)" }} className={LABEL}>Unlocks</p>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { devUnlockAll(); log("Unlocked everything"); }} style={btnPrimary} className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90">
              Unlock All
            </button>
            <button onClick={() => { devLockAll(); log("Reset to locked state"); }} style={btnOutline} className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80">
              Lock All
            </button>
          </div>

          <div style={{ borderColor: "var(--divider)" }} className="pt-2 border-t flex flex-col gap-1.5">
            <p style={{ color: "var(--text-muted)" }} className="text-xs">Automations</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { devSetAutoUnlocks(true, autoRaceUnlocked); log("Auto-scavenge ON"); }}
                style={autoScavengeUnlocked ? btnPrimary : btnOutline}
                className={`rounded ${autoScavengeUnlocked ? "" : "border"} px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80`}
              >
                Auto-Scavenge {autoScavengeUnlocked ? "\u2713" : "off"}
              </button>
              <button
                onClick={() => { devSetAutoUnlocks(autoScavengeUnlocked, true); log("Auto-race ON"); }}
                style={autoRaceUnlocked ? btnPrimary : btnOutline}
                className={`rounded ${autoRaceUnlocked ? "" : "border"} px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80`}
              >
                Auto-Race {autoRaceUnlocked ? "\u2713" : "off"}
              </button>
              <button
                onClick={() => { devSetAutoUnlocks(false, false); log("Automations OFF"); }}
                style={btnOutline}
                className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              >
                Disable Both
              </button>
              <button
                onClick={() => { useGameStore.setState({ tutorialStep: 0 }); log("Tutorial reset to step 0"); }}
                style={btnOutline}
                className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              >
                Launch Tutorial
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ color: "var(--text-muted)" }} className="text-xs">Scavenge ×</span>
              {[1, 5, 10, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => { devSetScavengeMultiplier(n); log(`Scavenge multiplier set to ${n}×`); }}
                  style={devScavengeMultiplier === n ? btnPrimary : btnOutline}
                  className={`rounded ${devScavengeMultiplier === n ? "" : "border"} px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80`}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderColor: "var(--divider)" }} className="pt-2 border-t flex flex-col gap-1.5">
            <p style={{ color: "var(--text-muted)" }} className="text-xs">
              Locations: {unlockedLocationIds.length}/{LOCATION_DEFINITIONS.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {LOCATION_DEFINITIONS.map((l) => (
                <span
                  key={l.id}
                  style={{
                    background: unlockedLocationIds.includes(l.id) ? "rgba(92,184,92,.12)" : "var(--panel-bg)",
                    color: unlockedLocationIds.includes(l.id) ? "var(--success)" : "var(--text-muted)",
                  }}
                  className="text-xs rounded px-1.5 py-0.5"
                >
                  {l.name}
                </span>
              ))}
            </div>
            <p style={{ color: "var(--text-muted)" }} className="text-xs mt-1">
              Circuits: {unlockedCircuitIds.length}/{CIRCUIT_DEFINITIONS.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {CIRCUIT_DEFINITIONS.map((c) => (
                <span
                  key={c.id}
                  style={{
                    background: unlockedCircuitIds.includes(c.id) ? "rgba(92,184,92,.12)" : "var(--panel-bg)",
                    color: unlockedCircuitIds.includes(c.id) ? "var(--success)" : "var(--text-muted)",
                  }}
                  className="text-xs rounded px-1.5 py-0.5"
                >
                  {c.name}
                </span>
              ))}
            </div>
            <p style={{ color: "var(--text-muted)" }} className="text-xs mt-1">
              Vehicles: {unlockedVehicleIds.length}/{VEHICLE_DEFINITIONS.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {VEHICLE_DEFINITIONS.map((v) => (
                <span
                  key={v.id}
                  style={{
                    background: unlockedVehicleIds.includes(v.id) ? "rgba(92,184,92,.12)" : "var(--panel-bg)",
                    color: unlockedVehicleIds.includes(v.id) ? "var(--success)" : "var(--text-muted)",
                  }}
                  className="text-xs rounded px-1.5 py-0.5"
                >
                  T{v.tier} {v.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Parts & Garage */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION}>
          <p style={{ color: "var(--text-heading)" }} className={LABEL}>Inventory & Garage</p>

          <div className="flex flex-col gap-2">
            <p style={{ color: "var(--text-muted)" }} className="text-xs">
              Inventory: {inventory.length} parts &nbsp;\u00b7&nbsp; Garage: {garage.length} vehicles
            </p>

            {/* Category picker */}
            <div className="flex gap-1 flex-wrap">
              {PART_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setPartCategory(cat); setPartId(""); }}
                  style={cat === partCategory ? btnPrimary : btnOutline}
                  className={`rounded ${cat === partCategory ? "" : "border"} px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Part picker */}
            <select
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
              className="rounded border px-2 py-1 text-sm focus:outline-none"
              value={partId || filteredParts[0]?.id}
              onChange={(e) => setPartId(e.target.value)}
            >
              {filteredParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (tier {p.minTier})
                </option>
              ))}
            </select>

            {/* Condition picker */}
            <div className="flex gap-1 flex-wrap">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPartCondition(c)}
                  style={c === partCondition ? btnPrimary : btnOutline}
                  className={`rounded ${c === partCondition ? "" : "border"} px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)", width: "60px" }}
                className="rounded border px-2 py-1 text-sm focus:outline-none"
                type="number"
                min={1}
                max={50}
                value={partCount}
                onChange={(e) => setPartCount(e.target.value)}
              />
              <button onClick={handleAddParts} style={btnPrimary} className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90">
                Add {selectedPartDef?.name ?? "Part"}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={handleAddAllParts} style={btnOutline} className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80">
                Add All {partCategory}s
              </button>
              <button onClick={handleAddOneOfEverything} style={btnOutline} className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80">
                One of Everything
              </button>
            </div>

            <div style={{ borderColor: "var(--divider)" }} className="flex gap-2 pt-2 border-t">
              <button onClick={() => { devClearInventory(); log("Cleared inventory"); }} style={btnDanger} className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90">
                Clear Inventory
              </button>
              <button onClick={() => { devClearGarage(); log("Cleared garage"); }} style={btnDanger} className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90">
                Clear Garage
              </button>
            </div>
          </div>
        </div>

        {/* Prestige */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION}>
          <p style={{ color: "var(--text-heading)" }} className={LABEL}>Prestige</p>
          <div className="flex gap-2 items-center">
            <input
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
              className="rounded border px-2 py-1 text-sm w-28 focus:outline-none"
              type="number"
              min={0}
              max={20}
              value={prestigeInput}
              onChange={(e) => setPrestigeInput(e.target.value)}
            />
            <button
              onClick={() => {
                const v = parseInt(prestigeInput);
                if (!isNaN(v) && v >= 0) {
                  devSetPrestigeCount(v);
                  log(`Set prestige = ${v}`);
                }
              }}
              style={btnAccent}
              className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            >
              Set Prestige
            </button>
          </div>
          <p style={{ color: "var(--text-muted)" }} className="text-xs">
            Adjusts prestige bonuses without resetting game state.
          </p>
        </div>

        {/* Danger zone */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--danger)" }} className={SECTION}>
          <p style={{ color: "var(--danger)" }} className={LABEL}>Danger Zone</p>
          <button
            onClick={() => {
              if (confirm("Full reset? This clears all progress including prestige.")) {
                devResetSave();
                log("\ud83d\udd34 Full save reset");
              }
            }}
            style={btnDanger}
            className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          >
            Full Save Reset
          </button>
          <p style={{ color: "var(--text-muted)" }} className="text-xs">
            Wipes everything \u2014 scrap, rep, inventory, garage, prestige.
          </p>
        </div>

        {/* Log */}
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION}>
          <p style={{ color: "var(--text-heading)" }} className={LABEL}>Action Log</p>
          {addLog.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }} className="text-xs">No actions yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {addLog.map((entry, i) => (
                <span key={i} style={{ color: "var(--text-secondary)" }} className="font-mono text-xs">
                  {entry}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
