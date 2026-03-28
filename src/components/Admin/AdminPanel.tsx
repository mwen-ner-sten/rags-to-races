"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { PART_DEFINITIONS, CONDITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { formatNumber } from "@/utils/format";
import type { PartCondition } from "@/data/parts";

const SECTION = "rounded-lg border border-zinc-700 bg-zinc-900 p-4 flex flex-col gap-3";
const LABEL = "text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1";
const BTN =
  "rounded px-3 py-1.5 text-xs font-semibold transition-colors";
const BTN_ORANGE = `${BTN} bg-orange-600 text-white hover:bg-orange-500`;
const BTN_RED = `${BTN} bg-red-800 text-white hover:bg-red-700`;
const BTN_ZINC = `${BTN} border border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white`;
const BTN_AMBER = `${BTN} bg-amber-700 text-white hover:bg-amber-600`;
const INPUT =
  "rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white w-28 focus:outline-none focus:border-orange-500";

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
  const devResetSave = useGameStore((s) => s.devResetSave);

  // Local state for controlled inputs
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
    log(`Added ${count}× ${def?.name ?? defId} (${partCondition})`);
  }

  function handleAddAllParts() {
    const ids = filteredParts.map((p) => p.id);
    devAddPartsToInventory(ids, partCondition, 1);
    log(`Added all ${filteredParts.length} ${partCategory} parts (${partCondition})`);
  }

  function handleAddOneOfEverything() {
    const ids = PART_DEFINITIONS.map((p) => p.id);
    devAddPartsToInventory(ids, partCondition, 1);
    log(`Added 1× every part (${partCondition}) — ${ids.length} total`);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Warning banner */}
      <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 px-4 py-2 text-xs text-yellow-400">
        ⚠ Dev Panel — for development & testing only. Changes are saved to localStorage.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Currency ── */}
        <div className={SECTION}>
          <p className={LABEL}>Currency</p>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-500">
              Scrap Bucks: <span className="text-green-400 font-mono">${formatNumber(scrapBucks)}</span>
            </span>
            <div className="flex gap-1 flex-wrap">
              {QUICK_SCRAP.map((n) => (
                <button key={n} onClick={() => { devAddScrapBucks(n); log(`+$${formatNumber(n)} Scrap Bucks`); }} className={BTN_ZINC}>
                  +${formatNumber(n)}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                className={INPUT}
                placeholder="Set to..."
                value={scrapInput}
                onChange={(e) => setScrapInput(e.target.value)}
              />
              <button
                onClick={() => { const v = parseFloat(scrapInput); if (!isNaN(v)) { devSetScrapBucks(v); log(`Set Scrap Bucks = $${formatNumber(v)}`); setScrapInput(""); } }}
                className={BTN_ORANGE}
              >
                Set
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">
              Rep Points: <span className="text-blue-400 font-mono">{formatNumber(repPoints)}</span>
            </span>
            <div className="flex gap-1 flex-wrap">
              {QUICK_REP.map((n) => (
                <button key={n} onClick={() => { devAddRepPoints(n); log(`+${n} Rep`); }} className={BTN_ZINC}>
                  +{n} Rep
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                className={INPUT}
                placeholder="Set to..."
                value={repInput}
                onChange={(e) => setRepInput(e.target.value)}
              />
              <button
                onClick={() => { const v = parseFloat(repInput); if (!isNaN(v)) { devSetRepPoints(v); log(`Set Rep = ${formatNumber(v)}`); setRepInput(""); } }}
                className={BTN_ORANGE}
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* ── Unlocks ── */}
        <div className={SECTION}>
          <p className={LABEL}>Unlocks</p>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { devUnlockAll(); log("Unlocked everything"); }} className={BTN_ORANGE}>
              Unlock All
            </button>
            <button onClick={() => { devLockAll(); log("Reset to locked state"); }} className={BTN_ZINC}>
              Lock All
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5">
            <p className="text-xs text-zinc-500">Automations</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { devSetAutoUnlocks(true, autoRaceUnlocked); log("Auto-scavenge ON"); }}
                className={autoScavengeUnlocked ? BTN_ORANGE : BTN_ZINC}
              >
                Auto-Scavenge {autoScavengeUnlocked ? "✓" : "off"}
              </button>
              <button
                onClick={() => { devSetAutoUnlocks(autoScavengeUnlocked, true); log("Auto-race ON"); }}
                className={autoRaceUnlocked ? BTN_ORANGE : BTN_ZINC}
              >
                Auto-Race {autoRaceUnlocked ? "✓" : "off"}
              </button>
              <button
                onClick={() => { devSetAutoUnlocks(false, false); log("Automations OFF"); }}
                className={BTN_ZINC}
              >
                Disable Both
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5">
            <p className="text-xs text-zinc-500">
              Locations: {unlockedLocationIds.length}/{LOCATION_DEFINITIONS.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {LOCATION_DEFINITIONS.map((l) => (
                <span
                  key={l.id}
                  className={`text-xs rounded px-1.5 py-0.5 ${unlockedLocationIds.includes(l.id) ? "bg-green-900/40 text-green-400" : "bg-zinc-800 text-zinc-600"}`}
                >
                  {l.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Circuits: {unlockedCircuitIds.length}/{CIRCUIT_DEFINITIONS.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {CIRCUIT_DEFINITIONS.map((c) => (
                <span
                  key={c.id}
                  className={`text-xs rounded px-1.5 py-0.5 ${unlockedCircuitIds.includes(c.id) ? "bg-green-900/40 text-green-400" : "bg-zinc-800 text-zinc-600"}`}
                >
                  {c.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Vehicles: {unlockedVehicleIds.length}/{VEHICLE_DEFINITIONS.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {VEHICLE_DEFINITIONS.map((v) => (
                <span
                  key={v.id}
                  className={`text-xs rounded px-1.5 py-0.5 ${unlockedVehicleIds.includes(v.id) ? "bg-green-900/40 text-green-400" : "bg-zinc-800 text-zinc-600"}`}
                >
                  T{v.tier} {v.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Parts & Garage ── */}
        <div className={SECTION}>
          <p className={LABEL}>Inventory & Garage</p>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500">
              Inventory: {inventory.length} parts &nbsp;·&nbsp; Garage: {garage.length} vehicles
            </p>

            {/* Category picker */}
            <div className="flex gap-1 flex-wrap">
              {PART_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setPartCategory(cat); setPartId(""); }}
                  className={cat === partCategory ? BTN_ORANGE : BTN_ZINC}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Part picker */}
            <select
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
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
                  className={c === partCondition ? BTN_ORANGE : BTN_ZINC}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                className={INPUT}
                type="number"
                min={1}
                max={50}
                value={partCount}
                onChange={(e) => setPartCount(e.target.value)}
                style={{ width: "60px" }}
              />
              <button onClick={handleAddParts} className={BTN_ORANGE}>
                Add {selectedPartDef?.name ?? "Part"}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={handleAddAllParts} className={BTN_ZINC}>
                Add All {partCategory}s
              </button>
              <button onClick={handleAddOneOfEverything} className={BTN_ZINC}>
                One of Everything
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button onClick={() => { devClearInventory(); log("Cleared inventory"); }} className={BTN_RED}>
                Clear Inventory
              </button>
              <button onClick={() => { devClearGarage(); log("Cleared garage"); }} className={BTN_RED}>
                Clear Garage
              </button>
            </div>
          </div>
        </div>

        {/* ── Prestige ── */}
        <div className={SECTION}>
          <p className={LABEL}>Prestige</p>
          <div className="flex gap-2 items-center">
            <input
              className={INPUT}
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
              className={BTN_AMBER}
            >
              Set Prestige
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Adjusts prestige bonuses without resetting game state.
          </p>
        </div>

        {/* ── Danger zone ── */}
        <div className={`${SECTION} border-red-900`}>
          <p className={`${LABEL} text-red-400`}>Danger Zone</p>
          <button
            onClick={() => {
              if (confirm("Full reset? This clears all progress including prestige.")) {
                devResetSave();
                log("🔴 Full save reset");
              }
            }}
            className={BTN_RED}
          >
            Full Save Reset
          </button>
          <p className="text-xs text-zinc-600">
            Wipes everything — scrap, rep, inventory, garage, prestige.
          </p>
        </div>

        {/* ── Log ── */}
        <div className={SECTION}>
          <p className={LABEL}>Action Log</p>
          {addLog.length === 0 ? (
            <p className="text-xs text-zinc-600">No actions yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {addLog.map((entry, i) => (
                <span key={i} className="font-mono text-xs text-zinc-400">
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
