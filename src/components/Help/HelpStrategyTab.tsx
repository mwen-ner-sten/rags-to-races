"use client";

import { HELP_STRATEGY } from "@/data/helpContent";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg border p-4 sm:p-5"
      style={{ borderColor: "var(--divider)", background: "var(--panel-bg)" }}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function HelpStrategyTab() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionCard title="Strategy Guide">
        <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Tips and decision guides for mid-to-late game. Assumes you&apos;ve completed the tutorial.
        </p>
        <div className="space-y-2">
          {HELP_STRATEGY.map((card) => (
            <details key={card.id} className="rounded border" style={{ borderColor: "var(--panel-border)" }}>
              <summary
                className="cursor-pointer px-3 py-2 text-sm font-semibold"
                style={{ color: "var(--text-white)" }}
              >
                {card.title}
              </summary>
              <div className="border-t px-3 py-2" style={{ borderColor: "var(--panel-border)" }}>
                <ul className="list-disc space-y-1.5 pl-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {card.advice.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
