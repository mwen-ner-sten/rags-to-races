"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import { buildContext } from "@/hooks/useMechanicAdvisor";
import type { AIModel } from "@/lib/mechanic-types";
import { formatPrice, formatPricePer1M, formatContext, formatModality } from "@/lib/format-model";

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
  const [filter, setFilter] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  function toggleModel(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_MODELS ? [...prev, id] : prev,
    );
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

    const initial: Record<string, ComparisonResult> = {};
    for (const id of selectedIds) {
      initial[id] = { text: "", status: "streaming", startTime: Date.now() };
    }
    setResults(initial);

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

  const filteredModels = models
    .filter((m) => {
      if (freeOnly && parseFloat(m.pricing.prompt) > 0) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    })
    .sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt));

  return (
    <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className={SECTION + " lg:col-span-3"}>
      <p style={{ color: "var(--text-heading)" }} className={LABEL}>Model Comparison</p>
      <p style={{ color: "var(--text-muted)" }} className="text-xs">
        Check up to 3 models and run the same Gearhead Gary prompt against all of them.
        Each model uses 1 of your 5 req/min rate limit.
      </p>

      {/* Selected models chips + run button */}
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
        {selectedIds.length === 0 && (
          <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>No models selected</span>
        )}
        <button
          onClick={runComparison}
          disabled={isRunning || selectedIds.length < 2}
          className="ml-auto rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={selectedIds.length >= 2 && !isRunning ? btnPrimary : btnOutline}
        >
          {isRunning ? "Running..." : `Run Comparison (${selectedIds.length}/${MAX_MODELS})`}
        </button>
      </div>

      {/* Searchable model table with checkboxes */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter models..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded border px-2 py-1.5 text-xs"
          style={{ background: "var(--input-bg, var(--panel-bg))", borderColor: "var(--input-border, var(--panel-border))", color: "var(--text-primary)" }}
        />
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => setFreeOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Free only
        </label>
      </div>
      <div className="max-h-48 overflow-y-auto rounded border" style={{ borderColor: "var(--panel-border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--surface-bg, var(--panel-bg))" }}>
              <th className="px-2 py-1 w-6"></th>
              <th className="text-left px-2 py-1 font-semibold" style={{ color: "var(--text-heading)" }}>Model</th>
              <th className="text-right px-2 py-1 font-semibold" style={{ color: "var(--text-heading)" }}>In $/1M</th>
              <th className="text-right px-2 py-1 font-semibold" style={{ color: "var(--text-heading)" }}>Out $/1M</th>
              <th className="text-right px-2 py-1 font-semibold" style={{ color: "var(--text-heading)" }}>Context</th>
              <th className="text-right px-2 py-1 font-semibold" style={{ color: "var(--text-heading)" }}>Max Out</th>
              <th className="text-center px-2 py-1 font-semibold" style={{ color: "var(--text-heading)" }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((m) => {
              const checked = selectedIds.includes(m.id);
              const disabled = !checked && selectedIds.length >= MAX_MODELS;
              return (
                <tr
                  key={m.id}
                  onClick={() => !disabled && toggleModel(m.id)}
                  className="transition-colors"
                  style={{
                    background: checked ? "var(--accent-bg, rgba(99,102,241,0.15))" : "transparent",
                    borderBottom: "1px solid var(--divider, var(--panel-border))",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleModel(m.id)}
                      className="accent-[var(--accent)]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <span style={{ color: checked ? "var(--accent)" : "var(--text-primary)" }}>{m.name}</span>
                    <br />
                    <span style={{ color: "var(--text-muted)" }} className="text-[10px]">{m.id}</span>
                  </td>
                  <td className="text-right px-2 py-1.5 font-mono" style={{ color: "var(--text-secondary, var(--text-muted))" }}>
                    {formatPrice(m.pricing.prompt)}
                  </td>
                  <td className="text-right px-2 py-1.5 font-mono" style={{ color: "var(--text-secondary, var(--text-muted))" }}>
                    {formatPrice(m.pricing.completion)}
                  </td>
                  <td className="text-right px-2 py-1.5 font-mono" style={{ color: "var(--text-secondary, var(--text-muted))" }}>
                    {formatContext(m.contextLength)}
                  </td>
                  <td className="text-right px-2 py-1.5 font-mono" style={{ color: "var(--text-secondary, var(--text-muted))" }}>
                    {formatContext(m.maxCompletionTokens)}
                  </td>
                  <td className="text-center px-2 py-1.5">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: formatModality(m.modality) === "multi" ? "var(--accent-bg, rgba(99,102,241,0.15))" : "transparent",
                        color: formatModality(m.modality) === "multi" ? "var(--accent)" : "var(--text-muted)",
                        border: formatModality(m.modality) === "text" ? "1px solid var(--panel-border)" : "none",
                      }}
                    >
                      {formatModality(m.modality)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {selectedIds.map((id) => {
            const r = results[id];
            if (!r) return null;
            const m = models.find((x) => x.id === id);
            const elapsed = r.startTime && r.endTime ? ((r.endTime - r.startTime) / 1000).toFixed(1) : null;

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
                      {m?.id}
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

                {/* Model stats */}
                {m && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                    <span>In: {formatPricePer1M(m.pricing.prompt)}</span>
                    <span>Out: {formatPricePer1M(m.pricing.completion)}</span>
                    <span>Ctx: {formatContext(m.contextLength)}</span>
                    <span>MaxOut: {formatContext(m.maxCompletionTokens)}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 font-semibold"
                      style={{
                        background: formatModality(m.modality) === "multi" ? "var(--accent-bg, rgba(99,102,241,0.15))" : "transparent",
                        color: formatModality(m.modality) === "multi" ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {formatModality(m.modality)}
                    </span>
                  </div>
                )}

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
