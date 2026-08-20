"use client";

import type { ContextualCoach } from "@/engine/contextualCoaching";

interface ContextualCoachCardProps {
  coach: ContextualCoach;
  onNavigate: (coach: ContextualCoach) => void;
  onDismiss: (coachId: ContextualCoach["id"]) => void;
}

export default function ContextualCoachCard({ coach, onNavigate, onDismiss }: ContextualCoachCardProps) {
  const headingId = `contextual-coach-${coach.id}-heading`;
  const shortName = coach.heading.replace(/^Next step:\s*/i, "");

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby={headingId}
      className="pointer-events-none fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-40 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[min(28rem,calc(100vw-3rem))]"
    >
      <div
        className="pointer-events-auto rounded-xl border p-4 shadow-2xl"
        style={{
          borderColor: "var(--accent-border)",
          background: "var(--modal-bg, var(--panel-bg))",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
              {coach.heading}
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {coach.body}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(coach.id)}
            aria-label={`Dismiss ${shortName} coaching`}
            className="min-h-11 min-w-11 shrink-0 rounded-lg border text-lg leading-none"
            style={{ borderColor: "var(--btn-border)", color: "var(--text-secondary)" }}
          >
            ×
          </button>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(coach)}
          className="mt-3 min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold sm:w-auto"
          style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
        >
          {coach.actionName}
        </button>
      </div>
    </aside>
  );
}
