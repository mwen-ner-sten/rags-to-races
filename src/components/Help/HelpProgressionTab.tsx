"use client";

import { HELP_LOCATIONS, HELP_CIRCUITS, HELP_VEHICLES, HELP_CHALLENGES, HELP_DEALER } from "@/data/helpContent";
import { formatNumber } from "@/utils/format";

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

export default function HelpProgressionTab() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Key Thresholds */}
      <SectionCard title="Key Thresholds">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Auto-Scavenge", value: "100 clicks" },
            { label: "Auto-Race", value: "30 Rep" },
            { label: "Dealer", value: `${formatNumber(HELP_DEALER.unlockRep)} Rep` },
            { label: "Crafting", value: "~15k Rep" },
            { label: "Dealer T2", value: `${formatNumber(HELP_DEALER.tier2Rep)} Rep` },
            { label: "Dealer T3", value: `${formatNumber(HELP_DEALER.tier3Rep)} Rep` },
            { label: "Auto-Race", value: "Prestige 1" },
            { label: "Junk Filter", value: "Prestige 2" },
            { label: "Playstyle Tab", value: "Prestige 3" },
            { label: "Quick Builder", value: "Prestige 5" },
          ].map((item) => (
            <div key={item.label} className="rounded border p-2 text-center" style={{ borderColor: "var(--panel-border)" }}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-white)" }}>{item.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Auto-Race fires every 3 ticks by default. The Pit Crew workshop upgrade reduces this by 1 tick per level (minimum 1 tick).
        </p>
      </SectionCard>

      {/* Locations & Circuits */}
      <SectionCard title="Locations & Circuits">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Scavenging Locations ({HELP_LOCATIONS.length})
            </h3>
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
              {HELP_LOCATIONS.map((loc) => (
                <div key={loc.id} className="rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="font-semibold" style={{ color: "var(--text-white)" }}>
                    T{loc.tier} · {loc.name}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    Unlock: {formatNumber(loc.unlockCost)} Rep · up to {loc.maxPartsPerScavenge} part(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Race Circuits ({HELP_CIRCUITS.length})
            </h3>
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
              {HELP_CIRCUITS.map((c) => (
                <div key={c.id} className="rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="font-semibold" style={{ color: "var(--text-white)" }}>
                    T{c.tier} · {c.name}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    Diff {c.difficulty} · Entry ${formatNumber(c.entryFee)} · Win ${formatNumber(c.rewardBase)} + {c.repReward} Rep
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Vehicles */}
      <SectionCard title="Vehicle Blueprints">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {HELP_VEHICLES.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
              <span style={{ color: "var(--text-white)" }}>T{v.tier} · {v.name}</span>
              <span style={{ color: "var(--text-muted)" }}>{v.slotCount} slots · ${formatNumber(v.buildCost)}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Challenges */}
      <SectionCard title="Challenges">
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {HELP_CHALLENGES.map((c) => (
            <div key={c.id} className="rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
              <div className="flex justify-between">
                <span className="font-semibold" style={{ color: "var(--text-white)" }}>{c.name}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {c.rewardSummary}
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>{c.description}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
