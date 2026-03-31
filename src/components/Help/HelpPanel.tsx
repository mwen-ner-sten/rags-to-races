"use client";

import {
  HELP_OVERVIEW_STEPS,
  HELP_GLOSSARY,
  HELP_SYNC_FACTS,
  HELP_SYSTEM_DETAILS,
} from "@/data/helpContent";
import { formatNumber, capitalize } from "@/utils/format";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg border p-4 sm:p-5"
      style={{ borderColor: "var(--divider)", background: "var(--panel-bg)" }}
    >
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-heading)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function HelpPanel() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionCard title="How to Play">
        <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--text-primary)" }}>
          {HELP_OVERVIEW_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title="Game Terms">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HELP_GLOSSARY.map((item) => (
            <div key={item.term} className="rounded border p-3" style={{ borderColor: "var(--panel-border)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-white)" }}>{item.term}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{item.meaning}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Live Data Snapshot (Auto-Synced)">
        <ul className="list-disc space-y-1.5 pl-5 text-sm" style={{ color: "var(--text-primary)" }}>
          {HELP_SYNC_FACTS.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          This section is generated from exported game definition data, so it updates when definitions change.
        </p>
      </SectionCard>

      <SectionCard title="Parts & Conditions">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Core Part Pools
            </h3>
            <div className="mt-2 space-y-1.5">
              {HELP_SYSTEM_DETAILS.partsByCategory.map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{capitalize(item.category)}</span>
                  <span style={{ color: "var(--text-white)" }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Condition Multipliers
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {HELP_SYSTEM_DETAILS.conditions.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{capitalize(item.id)}</span>
                  <span style={{ color: "var(--text-white)" }}>x{item.multiplier.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Progression Milestones">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Locations
            </h3>
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
              {HELP_SYSTEM_DETAILS.locations.map((location) => (
                <div key={location.id} className="rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="font-semibold" style={{ color: "var(--text-white)" }}>
                    T{location.tier} · {location.name}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    Unlock: {formatNumber(location.unlockCost)} Rep · up to {location.maxPartsPerScavenge} part(s) per scavenge
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Circuits
            </h3>
            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
              {HELP_SYSTEM_DETAILS.circuits.map((circuit) => (
                <div key={circuit.id} className="rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="font-semibold" style={{ color: "var(--text-white)" }}>
                    T{circuit.tier} · {circuit.name}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    Diff {circuit.difficulty} · Entry ${formatNumber(circuit.entryFee)} · Win ${formatNumber(circuit.rewardBase)} + {circuit.repReward} Rep
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Current cap: part tier {HELP_SYSTEM_DETAILS.progression.highestPartTier}. Dealer unlocks at {formatNumber(HELP_SYSTEM_DETAILS.progression.dealerUnlockRep)} Rep.
        </p>
      </SectionCard>
    </div>
  );
}
