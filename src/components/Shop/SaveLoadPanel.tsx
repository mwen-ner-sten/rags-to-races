"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  getSlotMeta,
  exportSaveFile,
  importSaveFile,
  type SaveSlotMeta,
} from "@/utils/saveLoad";
import { formatNumber } from "@/utils/format";

const BTN = "rounded px-3 py-1.5 text-xs font-semibold transition-colors";
const BTN_ORANGE = `${BTN} bg-orange-600 text-white hover:bg-orange-500`;
const BTN_ZINC = `${BTN} border border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white`;
const BTN_RED = `${BTN} border border-red-800 text-red-400 hover:border-red-600 hover:text-red-300`;
const BTN_GREEN = `${BTN} bg-green-700 text-white hover:bg-green-600`;

function formatTimestamp(ts: number | null): string {
  if (!ts) return "Empty";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

export default function SaveLoadPanel() {
  const [slots, setSlots] = useState<SaveSlotMeta[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSlots = useCallback(() => setSlots(getSlotMeta()), []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function handleSave(slot: number) {
    saveToSlot(slot, `Slot ${slot + 1}`);
    refreshSlots();
    showToast(`Saved to Slot ${slot + 1}`);
  }

  function handleLoad(slot: number) {
    const ok = loadFromSlot(slot);
    if (ok) {
      showToast(`Loaded Slot ${slot + 1}`);
    } else {
      showToast("Slot is empty", "err");
    }
  }

  function handleDelete(slot: number) {
    deleteSlot(slot);
    refreshSlots();
    showToast(`Slot ${slot + 1} cleared`);
  }

  function handleExport() {
    exportSaveFile();
    showToast("Save file downloaded");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    const err = await importSaveFile(file);
    setImporting(false);
    if (err) {
      setImportError(err);
      showToast(err, "err");
    } else {
      refreshSlots();
      showToast("Save imported successfully!");
    }
    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg transition-all ${
            toast.type === "ok"
              ? "bg-green-800 text-green-100"
              : "bg-red-800 text-red-100"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Save Slots */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Save Slots
        </h3>
        <div className="flex flex-col gap-3">
          {slots.map((meta) => (
            <div
              key={meta.slot}
              className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3"
            >
              {/* Slot info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    Slot {meta.slot + 1}
                  </span>
                  {meta.timestamp ? (
                    <span className="text-xs text-zinc-500">
                      {formatTimestamp(meta.timestamp)}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-700 italic">empty</span>
                  )}
                </div>
                {meta.timestamp && (
                  <div className="mt-0.5 flex gap-3 text-xs text-zinc-500">
                    <span>${formatNumber(meta.scrapBucks)} Scrap</span>
                    <span>{formatNumber(meta.repPoints)} Rep</span>
                    <span>{meta.vehicleCount} vehicle{meta.vehicleCount !== 1 ? "s" : ""}</span>
                    {meta.prestigeCount > 0 && (
                      <span className="text-amber-500">P{meta.prestigeCount}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => handleSave(meta.slot)} className={BTN_ORANGE}>
                  Save
                </button>
                <button
                  onClick={() => handleLoad(meta.slot)}
                  disabled={!meta.timestamp}
                  className={`${BTN_GREEN} disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  Load
                </button>
                {meta.timestamp && (
                  <button
                    onClick={() => {
                      if (confirm(`Clear Slot ${meta.slot + 1}?`)) handleDelete(meta.slot);
                    }}
                    className={BTN_RED}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          The game also auto-saves to your browser on every action.
        </p>
      </div>

      {/* Export / Import */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Export / Import
        </h3>
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex flex-wrap gap-3 items-start">
            {/* Export */}
            <div className="flex flex-col gap-1">
              <button onClick={handleExport} className={BTN_ORANGE}>
                ⬇ Export Save File
              </button>
              <p className="text-xs text-zinc-600">Downloads a .json backup you can keep.</p>
            </div>

            {/* Import */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className={`${BTN_ZINC} disabled:opacity-50`}
              >
                {importing ? "Importing..." : "⬆ Import Save File"}
              </button>
              <p className="text-xs text-zinc-600">Load a .json save exported from this game.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImport}
              />
              {importError && (
                <p className="text-xs text-red-400">{importError}</p>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-600">
            <p>Import replaces your current game state. Consider saving to a slot first.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
