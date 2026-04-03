"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import {
  saveToSlot,
  exportSaveFile,
  getSlotMeta,
  type SaveSlotMeta,
} from "@/utils/saveLoad";
import { formatNumber } from "@/utils/format";

type Step = "idle" | "choose" | "pickSlot" | "confirmReset";

export default function StartOverPanel() {
  const [step, setStep] = useState<Step>("idle");
  const [slots, setSlots] = useState<SaveSlotMeta[]>(() => getSlotMeta());
  const [toast, setToast] = useState<string | null>(null);
  const resetSave = useGameStore((s) => s.resetSave);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleSaveToSlot(slot: number) {
    saveToSlot(slot, `Slot ${slot + 1}`);
    setSlots(getSlotMeta());
    showToast(`Saved to Slot ${slot + 1}`);
    setStep("confirmReset");
  }

  function handleExportAndContinue() {
    exportSaveFile("Backup before reset");
    showToast("Save file downloaded");
    setStep("confirmReset");
  }

  function handleReset() {
    resetSave();
    setStep("idle");
  }

  function handleCancel() {
    setStep("idle");
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          style={{ background: "rgba(92,184,92,.9)", color: "#fff" }}
          className="fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Step: idle */}
      {step === "idle" && (
        <div
          style={{ borderColor: "var(--danger)", background: "var(--panel-bg)" }}
          className="rounded-lg border p-4"
        >
          <button
            onClick={() => setStep("choose")}
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            className="rounded border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
          >
            Start Over
          </button>
          <p style={{ color: "var(--text-muted)" }} className="mt-2 text-xs">
            Erase all progress and start a brand new game.
          </p>
        </div>
      )}

      {/* Step: choose */}
      {step === "choose" && (
        <div
          style={{ borderColor: "var(--danger)", background: "var(--panel-bg)" }}
          className="flex flex-col gap-4 rounded-lg border p-4"
        >
          <p style={{ color: "var(--text-white)" }} className="text-sm font-semibold">
            Before you reset, would you like to back up your save?
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSlots(getSlotMeta());
                setStep("pickSlot");
              }}
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            >
              Save to Slot
            </button>
            <button
              onClick={handleExportAndContinue}
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
              className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            >
              Export Save File
            </button>
            <button
              onClick={() => setStep("confirmReset")}
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
              className="rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            >
              Skip &amp; Reset
            </button>
          </div>

          <button
            onClick={handleCancel}
            style={{ color: "var(--text-muted)" }}
            className="self-start text-xs underline transition-opacity hover:opacity-80"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Step: pickSlot */}
      {step === "pickSlot" && (
        <div
          style={{ borderColor: "var(--danger)", background: "var(--panel-bg)" }}
          className="flex flex-col gap-3 rounded-lg border p-4"
        >
          <p style={{ color: "var(--text-white)" }} className="text-sm font-semibold">
            Pick a slot to save your progress
          </p>

          <div className="flex flex-col gap-2">
            {slots.map((meta) => (
              <div
                key={meta.slot}
                style={{ background: "rgba(255,255,255,.03)", borderColor: "var(--panel-border)" }}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--text-white)" }} className="text-sm font-semibold">
                      Slot {meta.slot + 1}
                    </span>
                    {meta.timestamp ? (
                      <span style={{ color: "var(--text-muted)" }} className="text-xs">
                        (has data)
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }} className="text-xs italic">
                        empty
                      </span>
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
                <button
                  onClick={() => handleSaveToSlot(meta.slot)}
                  style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
                  className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
                >
                  {meta.timestamp ? "Overwrite & Continue" : "Save & Continue"}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleCancel}
            style={{ color: "var(--text-muted)" }}
            className="self-start text-xs underline transition-opacity hover:opacity-80"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Step: confirmReset */}
      {step === "confirmReset" && (
        <div
          style={{ borderColor: "var(--danger)", background: "var(--panel-bg)" }}
          className="flex flex-col gap-4 rounded-lg border p-4"
        >
          <div>
            <p style={{ color: "var(--danger)" }} className="text-sm font-bold">
              Are you sure?
            </p>
            <p style={{ color: "var(--text-muted)" }} className="mt-1 text-xs">
              This will permanently erase all progress — scrap, vehicles, prestige,
              legacy points, gear, talents, everything. This cannot be undone.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              style={{ background: "var(--danger)", color: "#fff" }}
              className="rounded px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              Reset Everything
            </button>
            <button
              onClick={handleCancel}
              style={{ borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
              className="rounded border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
