"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { buildContext } from "@/hooks/useMechanicAdvisor";
import type { AIModel } from "@/lib/mechanic-types";

const SECTION = "rounded-lg border p-4 flex flex-col gap-3";
const LABEL = "text-xs font-semibold uppercase tracking-wider mb-1";
const MAX_MODELS = 3;

interface ComparisonResult {
  text: string;
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
  startTime?: number;
  endTime?: number;
}

export default function ModelComparison({ models }: { models: AIModel[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ComparisonResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [addModelId, setAddModelId] = useState("");

  function addModel(id: string) {
    if (!id || selectedIds.includes(id) || selectedIds.length >= MAX_MODELS) return;
    setSelectedIds((prev) => [...prev, id]);
    setAddModelId("");
  }

  function removeModel(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function runComparison() {
    if (selectedIds.length < 2) return;
    setIsRunning(true);

    const state = useGameStore.getState();
    const context = buildContext(state);

    // Initialize results
    const initial: Record<string, ComparisonResult> = {};
    for (const id of selectedIds) {
      initial[id] = { text: "", status: "streaming", startTime: Date.now() };
    }
    setResults(initial);

    // Fire all requests in parallel
    const promises = selectedIds.map(async (modelId) => {
      try {
        const res = await fetch("/api/mechanic-advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...context, modelId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setResults((prev) => ({
            ...prev,
            [modelId]: { ...prev[modelId], text, status: "streaming" },
          }));
        }

        setResults((prev) => ({
          ...prev,
          [modelId]: { ...prev[modelId], text, status: "done", endTime: Date.now() },
        }));
      } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        setResults((prev) => ({
          ...prev,
          [modelId]: { ...prev[modelId], status: "error", error, endTime: Date.now() },
        }));
      }
    });

    await Promise.allSettled(promises);
    setIsRunning(false);
  }

  const btnPrimary = { background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" };
  const btnOutline = { borderColor: "var(--btn-border)", color: "var(--text-primary)" };

  if (models.length === 0) return null;

  return (
    <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION + " lg:col-span-3"}>
      <p style={{ color: "var(--text-heading)" }} className={LABEL}>Model Comparison</p>
      <p style={{ color: "var(--text-muted)" }} className="text-xs">
        Select 2-3 models and run the same Gearhead Gary prompt against all of them side-by-side.
        Each model uses 1 of your 5 req/min rate limit.
      </p>

      {/* Model selection */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.map((id) => {
          const m = models.find((x) => x.id === id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              style={{ background: "var(--accent-bg, rgba(99,102,241,0.15))", color: "var(--accent)" }}
            >
              {m?.name ?? id}
              <button
                onClick={() => removeModel(id)}
                className="ml-0.5 font-bold hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                x
              </button>
            </span>
          );
        })}
        {selectedIds.length < MAX_MODELS && (
          <select
            value={addModelId}
            onChange={(e) => addModel(e.target.value)}
            className="rounded border px-2 py-1 text-xs"
            style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--text-primary)" }}
          >
            <option value="">+ Add model...</option>
            {models
              .filter((m) => !selectedIds.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
          </select>
        )}
        <button
          onClick={runComparison}
          disabled={isRunning || selectedIds.length < 2}
          className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={selectedIds.length >= 2 && !isRunning ? btnPrimary : btnOutline}
        >
          {isRunning ? "Running..." : "Run Comparison"}
        </button>
      </div>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {selectedIds.map((id) => {
            const r = results[id];
            if (!r) return null;
            const m = models.find((x) => x.id === id);
            const elapsed = r.startTime && r.endTime ? ((r.endTime - r.startTime) / 1000).toFixed(1) : null;
            const promptPrice = m ? formatPricePer1M(m.pricing.prompt) : "?";
            const completionPrice = m ? formatPricePer1M(m.pricing.completion) : "?";

            return (
              <div
                key={id}
                className="rounded-lg border p-3 flex flex-col gap-2"
                style={{ borderColor: "var(--panel-border)", background: "var(--surface-bg, var(--panel-bg))" }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-heading)" }}>
                      {m?.name ?? id}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      In: {promptPrice} · Out: {completionPrice}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === "streaming" && (
                      <span className="text-[10px] font-semibold animate-pulse" style={{ color: "var(--accent)" }}>
                        streaming
                      </span>
                    )}
                    {r.status === "done" && (
                      <span className="text-[10px] font-semibold" style={{ color: "var(--success)" }}>
                        done
                      </span>
                    )}
                    {r.status === "error" && (
                      <span className="text-[10px] font-semibold" style={{ color: "var(--danger)" }}>
                        error
                      </span>
                    )}
                    {elapsed && (
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {elapsed}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Response */}
                <div className="min-h-[3rem]">
                  {r.error ? (
                    <p className="text-xs" style={{ color: "var(--danger)" }}>{r.error}</p>
                  ) : r.text ? (
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{r.text}</p>
                  ) : (
                    <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Waiting for response...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatPricePer1M(perToken: string): string {
  const n = parseFloat(perToken);
  if (!n || n === 0) return "free";
  const perMillion = n * 1_000_000;
  return perMillion < 0.01 ? "<$0.01/1M" : `$${perMillion.toFixed(2)}/1M`;
}
