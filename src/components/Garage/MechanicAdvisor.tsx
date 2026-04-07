"use client";

import { useState, useEffect } from "react";
import { useMechanicAdvisor, AI_MODEL_STORAGE_KEY } from "@/hooks/useMechanicAdvisor";

export default function MechanicAdvisor() {
  const { response, isLoading, error, askMechanic } = useMechanicAdvisor();
  const [modelId, setModelId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(AI_MODEL_STORAGE_KEY) ?? "" : "",
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AI_MODEL_STORAGE_KEY) setModelId(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div
      className="rounded-lg border p-3 sm:p-4"
      style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-heading)" }}
          >
            Gearhead Gary
          </h3>
          {modelId ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              via {modelId}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              No model selected (pick one in Dev tab)
            </p>
          )}
        </div>
        <button
          onClick={askMechanic}
          disabled={isLoading}
          className="rounded-lg border px-3 py-1 text-xs transition-colors"
          style={{
            borderColor: "var(--btn-border)",
            background: isLoading ? "transparent" : "var(--btn-primary-bg)",
            color: isLoading ? "var(--text-muted)" : "var(--btn-primary-text)",
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? "Thinking..." : "Ask the Mechanic"}
        </button>
      </div>

      {!response && !error && (
        <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
          *wipes hands on rag* What do you need, kid?
        </p>
      )}

      {response && (
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {response}
        </p>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
