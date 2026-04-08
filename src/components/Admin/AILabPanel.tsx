"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/state/store";
import { buildContext, AI_MODEL_STORAGE_KEY } from "@/hooks/useMechanicAdvisor";
import type { AIModel } from "@/lib/mechanic-types";
import { formatPrice, formatPricePer1M, formatContext, formatModality } from "@/lib/format-model";

// ── Types ──

interface ComparisonResult {
  text: string;
  status: "idle" | "streaming" | "done" | "error";
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface ModelTestRecord {
  runs: number;
  successes: number;
  failures: number;
  empties: number;
  totalResponseMs: number;
  lastTested: number;
}

type TestHistory = Record<string, ModelTestRecord>;

const HISTORY_KEY = "rags-ai-test-history";

function loadHistory(): TestHistory {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveHistory(h: TestHistory) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

// ── Component ──

export default function AILabPanel() {
  // ── Model list state ──
  const [models, setModels] = useState<AIModel[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("rags-ai-models");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [modelsLoading, setModelsLoading] = useState(false);
  const [activeModelId, setActiveModelId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(AI_MODEL_STORAGE_KEY) ?? "" : "",
  );
  const [filter, setFilter] = useState("");

  // ── Comparison state ──
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ComparisonResult>>({});
  const [isRunning, setIsRunning] = useState(false);

  // ── Test history ──
  const [history, setHistory] = useState<TestHistory>(loadHistory);

  // ── Auto-fetch on mount if cache is empty ──
  useEffect(() => {
    if (models.length === 0) fetchModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchModels() {
    setModelsLoading(true);
    try {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      const list = data.models ?? [];
      setModels(list);
      localStorage.setItem("rags-ai-models", JSON.stringify(list));
    } catch {
      // silently fail — user can retry with refresh
    } finally {
      setModelsLoading(false);
    }
  }

  function setActive(id: string) {
    setActiveModelId(id);
    localStorage.setItem(AI_MODEL_STORAGE_KEY, id);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function removeCompare(id: string) {
    setCompareIds((prev) => prev.filter((x) => x !== id));
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function recordResult(modelId: string, result: ComparisonResult) {
    setHistory((prev) => {
      const rec = prev[modelId] ?? { runs: 0, successes: 0, failures: 0, empties: 0, totalResponseMs: 0, lastTested: 0 };
      const elapsed = result.startTime && result.endTime ? result.endTime - result.startTime : 0;
      const updated: TestHistory = {
        ...prev,
        [modelId]: {
          runs: rec.runs + 1,
          successes: rec.successes + (result.text ? 1 : 0),
          failures: rec.failures + (result.status === "error" ? 1 : 0),
          empties: rec.empties + (result.status === "done" && !result.text ? 1 : 0),
          totalResponseMs: rec.totalResponseMs + elapsed,
          lastTested: Date.now(),
        },
      };
      saveHistory(updated);
      return updated;
    });
  }

  async function runComparison() {
    if (compareIds.length < 1) return;
    setIsRunning(true);

    const state = useGameStore.getState();
    const context = buildContext(state);

    const initial: Record<string, ComparisonResult> = {};
    for (const id of compareIds) {
      initial[id] = { text: "", status: "streaming", startTime: Date.now() };
    }
    setResults(initial);

    const promises = compareIds.map(async (modelId) => {
      const startTime = Date.now();
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
        const final: ComparisonResult = { text, status: "done", startTime, endTime: Date.now() };
        setResults((prev) => ({ ...prev, [modelId]: final }));
        recordResult(modelId, final);
      } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        const final: ComparisonResult = { text: "", status: "error", error, startTime, endTime: Date.now() };
        setResults((prev) => ({ ...prev, [modelId]: final }));
        recordResult(modelId, final);
      }
    });

    await Promise.allSettled(promises);
    setIsRunning(false);
  }

  // ── Derived ──
  const activeModel = models.find((m) => m.id === activeModelId);
  const filteredModels = models
    .filter((m) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    })
    .sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt));

  const testedCount = Object.keys(history).length;
  const compatibleIds = Object.entries(history)
    .filter(([, r]) => r.successes > 0)
    .map(([id]) => id);
  const incompatibleIds = Object.entries(history)
    .filter(([, r]) => r.runs > 0 && r.successes === 0)
    .map(([id]) => id);

  const btnPrimary: React.CSSProperties = { background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" };
  const btnOutline: React.CSSProperties = { borderColor: "var(--btn-border)", color: "var(--text-primary)" };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Active Model Bar ── */}
      <div
        className="rounded-lg border p-3 flex items-center justify-between gap-3"
        style={{
          borderColor: activeModel ? "var(--accent-border, var(--accent))" : "var(--panel-border)",
          background: "var(--panel-bg)",
        }}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>
            Active Model
          </p>
          {activeModel ? (
            <>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--accent)" }}>
                {activeModel.name}
              </p>
              <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                {activeModel.id} · {formatContext(activeModel.contextLength)} ctx · {formatPrice(activeModel.pricing.prompt)}
              </p>
            </>
          ) : (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
              No model selected — pick one below for Gearhead Gary
            </p>
          )}
        </div>
        <button
          onClick={fetchModels}
          disabled={modelsLoading}
          className="shrink-0 rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={btnOutline}
        >
          {modelsLoading ? "Loading..." : `Refresh (${models.length})`}
        </button>
      </div>

      {/* ── Compatibility Summary ── */}
      {testedCount > 0 && (
        <div
          className="rounded-lg border p-3 flex items-center justify-between gap-3"
          style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
        >
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span style={{ color: "var(--text-muted)" }}>Tested: <b style={{ color: "var(--text-primary)" }}>{testedCount}</b></span>
            <span style={{ color: "var(--text-muted)" }}>Compatible: <b style={{ color: "var(--success, #4ade80)" }}>{compatibleIds.length}</b></span>
            <span style={{ color: "var(--text-muted)" }}>Incompatible: <b style={{ color: "var(--danger)" }}>{incompatibleIds.length}</b></span>
          </div>
          <button
            onClick={() => { setHistory({}); saveHistory({}); }}
            className="rounded border px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80"
            style={btnOutline}
          >
            Clear History
          </button>
        </div>
      )}

      {/* ── Search ── */}
      {models.length > 0 && (
        <input
          type="text"
          placeholder="Search models..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            background: "var(--input-bg, var(--panel-bg))",
            borderColor: "var(--input-border, var(--panel-border))",
            color: "var(--text-primary)",
          }}
        />
      )}

      {/* ── Model List ── */}
      {models.length > 0 && (
        <div
          className="max-h-[28rem] overflow-y-auto rounded-lg border"
          style={{ borderColor: "var(--panel-border)" }}
        >
          {filteredModels.length === 0 ? (
            <p className="p-4 text-xs italic text-center" style={{ color: "var(--text-muted)" }}>
              No models match your search.
            </p>
          ) : (
            filteredModels.map((m) => {
              const isActive = activeModelId === m.id;
              const isCompare = compareIds.includes(m.id);
              const rec = history[m.id];
              return (
                <div
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all"
                  style={{
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    background: isCompare
                      ? "var(--accent-bg, rgba(99,102,241,0.08))"
                      : "transparent",
                    borderBottom: "1px solid var(--divider, var(--panel-border))",
                  }}
                >
                  {/* Comparison checkbox */}
                  <input
                    type="checkbox"
                    checked={isCompare}
                    onChange={(e) => { e.stopPropagation(); toggleCompare(m.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 accent-[var(--accent)]"
                    title="Add to comparison"
                  />

                  {/* Model info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                      >
                        {isActive && "\u2605 "}{m.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Test status badge */}
                        {rec && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: rec.successes > 0
                                ? "rgba(74,222,128,0.15)"
                                : "rgba(224,92,92,0.15)",
                              color: rec.successes > 0
                                ? "var(--success, #4ade80)"
                                : "var(--danger)",
                            }}
                          >
                            {rec.successes > 0
                              ? `${rec.successes}/${rec.runs}`
                              : "fail"}
                          </span>
                        )}
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          {formatContext(m.contextLength)}
                        </span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: formatModality(m.modality) === "multi"
                              ? "var(--accent-bg, rgba(99,102,241,0.15))"
                              : "transparent",
                            color: formatModality(m.modality) === "multi"
                              ? "var(--accent)"
                              : "var(--text-muted)",
                            border: formatModality(m.modality) === "text"
                              ? "1px solid var(--panel-border)"
                              : "none",
                          }}
                        >
                          {formatModality(m.modality)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      {m.id} · {formatPrice(m.pricing.prompt)}
                      {m.maxCompletionTokens > 0 && ` · ${formatContext(m.maxCompletionTokens)} max out`}
                      {rec && rec.successes > 0 && ` · avg ${(rec.totalResponseMs / rec.runs / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Comparison Controls ── */}
      <div
        className="rounded-lg border p-3 flex flex-col gap-2"
        style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>
              Compare
            </p>
            <button
              onClick={() => setCompareIds(filteredModels.map((m) => m.id))}
              className="rounded border px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80"
              style={btnOutline}
            >
              Select All
            </button>
            {compareIds.length > 0 && (
              <button
                onClick={() => { setCompareIds([]); setResults({}); }}
                className="rounded border px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80"
                style={btnOutline}
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={runComparison}
            disabled={isRunning || compareIds.length < 1}
            className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={compareIds.length >= 1 && !isRunning ? btnPrimary : btnOutline}
          >
            {isRunning ? "Running..." : `Run Comparison (${compareIds.length})`}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {compareIds.length === 0 && (
            <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>
              Check models above to add them here
            </span>
          )}
          {compareIds.map((id) => {
            const m = models.find((x) => x.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                style={{ background: "var(--accent-bg, rgba(99,102,241,0.15))", color: "var(--accent)" }}
              >
                {m?.name ?? id}
                <button
                  onClick={() => removeCompare(id)}
                  className="ml-0.5 font-bold hover:opacity-60"
                  style={{ color: "var(--accent)" }}
                >
                  x
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Comparison Results ── */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {compareIds.map((id) => {
            const r = results[id];
            if (!r) return null;
            const m = models.find((x) => x.id === id);
            const elapsed = r.startTime && r.endTime
              ? ((r.endTime - r.startTime) / 1000).toFixed(1)
              : r.startTime && r.status === "streaming"
                ? "..."
                : null;

            return (
              <div
                key={id}
                className="rounded-lg border p-3 flex flex-col gap-2"
                style={{
                  borderColor: r.status === "done" && r.text
                    ? "var(--success, #4ade80)"
                    : r.status === "done" && !r.text
                      ? "var(--warning, #eab308)"
                      : r.status === "error"
                        ? "var(--danger)"
                        : "var(--panel-border)",
                  background: "var(--panel-bg)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-heading)" }}>
                      {m?.name ?? id}
                    </p>
                    <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      {m?.id} · {m ? formatPricePer1M(m.pricing.prompt) : "?"} in · {m ? formatPricePer1M(m.pricing.completion) : "?"} out
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.status === "streaming" && (
                      <span className="text-[10px] font-semibold animate-pulse" style={{ color: "var(--accent)" }}>
                        streaming
                      </span>
                    )}
                    {r.status === "done" && r.text && (
                      <span className="text-[10px] font-semibold" style={{ color: "var(--success, #4ade80)" }}>
                        done
                      </span>
                    )}
                    {r.status === "done" && !r.text && (
                      <span className="text-[10px] font-semibold" style={{ color: "var(--warning, #eab308)" }}>
                        empty
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
                  ) : r.status === "done" ? (
                    <p className="text-xs italic" style={{ color: "var(--danger)" }}>Empty response — model returned nothing. It may not support this prompt format.</p>
                  ) : (
                    <p className="text-xs italic animate-pulse" style={{ color: "var(--text-muted)" }}>Waiting for response...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {models.length === 0 && !modelsLoading && (
        <div
          className="rounded-lg border p-6 text-center"
          style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
        >
          <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
            No models loaded. Click Refresh to fetch available models from OpenRouter.
          </p>
        </div>
      )}
    </div>
  );
}
