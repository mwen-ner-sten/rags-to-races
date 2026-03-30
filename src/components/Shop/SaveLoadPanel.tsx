"use client";

import { useState, useRef } from "react";
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
  const [slots, setSlots] = useState<SaveSlotMeta[]>(() => getSlotMeta());
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshSlots() { setSlots(getSlotMeta()); }

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Toast */}
      {toast && (
        <div
          style={{
            background: toast.type === "ok" ? "rgba(92,184,92,.9)" : "rgba(224,92,92,.9)",
            color: "#fff",
          }}
          className="fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg transition-all"
        >
          {toast.msg}
        </div>
      )}

      {/* Save Slots */}
      <div>
        <h3 style={{ color: "var(--text-heading)" }} className="mb-3 text-sm font-semibold uppercase tracking-widest">
          Save Slots
        </h3>
        <div className="flex flex-col gap-3">
          {slots.map((meta) => (
            <div
              key={meta.slot}
              style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {/* Slot info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--text-white)" }} className="text-sm font-semibold">
                    Slot {meta.slot + 1}
                  </span>
                  {meta.timestamp ? (
                    <span style={{ color: "var(--text-muted)" }} className="text-xs">
                      {formatTimestamp(meta.timestamp)}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }} className="text-xs italic">empty</span>
                  )}
                </div>
                {meta.timestamp && (
                  <div style={{ color: "var(--text-muted)" }} className="mt-0.5 flex gap-3 text-xs">
                    <span>${formatNumber(meta.scrapBucks)} Scrap</span>
                    <span>{formatNumber(meta.repPoints)} Rep</span>
                    <span>{meta.vehicleCount} vehicle{meta.vehicleCount !== 1 ? "s" : ""}</span>
                    {meta.prestigeCount > 0 && (
                      <span style={{ color: "var(--accent)" }}>P{meta.prestigeCount}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handleSave(meta.slot)}
                  style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                  className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
                >
                  Save
                </button>
                <button
                  onClick={() => handleLoad(meta.slot)}
                  disabled={!meta.timestamp}
                  style={{ background: "var(--success)", color: "var(--btn-primary-text)" }}
                  className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Load
                </button>
                {meta.timestamp && (
                  <button
                    onClick={() => {
                      if (confirm(`Clear Slot ${meta.slot + 1}?`)) handleDelete(meta.slot);
                    }}
                    style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  >
                    &#10005;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--text-muted)" }} className="mt-2 text-xs">
          The game also auto-saves to your browser on every action.
        </p>
      </div>

      {/* Export / Import */}
      <div>
        <h3 style={{ color: "var(--text-heading)" }} className="mb-3 text-sm font-semibold uppercase tracking-widest">
          Export / Import
        </h3>
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap gap-3 items-start">
            {/* Export */}
            <div className="flex flex-col gap-1">
              <button
                onClick={handleExport}
                style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                &#11015; Export Save File
              </button>
              <p style={{ color: "var(--text-muted)" }} className="text-xs">Downloads a .json backup you can keep.</p>
            </div>

            {/* Import */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
                className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {importing ? "Importing..." : "\u2B06 Import Save File"}
              </button>
              <p style={{ color: "var(--text-muted)" }} className="text-xs">Load a .json save exported from this game.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImport}
              />
              {importError && (
                <p style={{ color: "var(--danger)" }} className="text-xs">{importError}</p>
              )}
            </div>
          </div>

          <div style={{ borderColor: "var(--divider)", color: "var(--text-muted)" }} className="border-t pt-3 text-xs">
            <p>Import replaces your current game state. Consider saving to a slot first.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
