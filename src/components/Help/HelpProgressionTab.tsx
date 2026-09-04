"use client";

import { HELP_LOCATIONS, HELP_CIRCUITS, HELP_VEHICLES, HELP_CHALLENGES, HELP_DEALER } from "@/data/helpContent";
import { formatNumber } from "@/utils/format";
import { REP_UNLOCK_COSTS } from "@/config/progression";
import { WORKSHOP_TABS } from "@/data/workshopTabs";

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
            { label: "Auto-Scavenge", value: "From the start" },
            { label: "Dealer", value: `${formatNumber(HELP_DEALER.unlockRep)} lifetime Rep` },
            { label: "Crafting", value: `Costs ${formatNumber(REP_UNLOCK_COSTS.workshop.parts_bin)} Rep` },
            { label: "Dealer T2", value: `${formatNumber(HELP_DEALER.tier2Rep)} lifetime Rep` },
            { label: "Dealer T3", value: `${formatNumber(HELP_DEALER.tier3Rep)} lifetime Rep` },
            { label: "Auto-Race", value: "First vehicle" },
            { label: "Junk Filter", value: "Prestige 2" },
            { label: "Garage Philosophy", value: "Scrap Reset 1" },
            { label: "Quick Builder", value: "Prestige 5" },
          ].map((item) => (
            <div key={item.label} className="rounded border p-2 text-center" style={{ borderColor: "var(--panel-border)" }}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-white)" }}>{item.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          The garage works on its own from the first tick: one scavenge per tick, and one race every 3 ticks once a vehicle is active.
          Manual scavenging and racing are the active accelerators. The Pit Crew facility and the Pit Rhythm milestone each shave a tick off the race cadence (minimum 1),
          and auto-race pauses below the condition floor you set on the Race tab.
        </p>
      </SectionCard>

      {/* Workshop sections */}
      <SectionCard title="Workshop Sections">
        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Workshop sections appear when they first have something for you to do.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {WORKSHOP_TABS.map((tab) => (
            <div key={tab.id} className="rounded border p-2" style={{ borderColor: "var(--panel-border)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-white)" }}>{tab.label}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{tab.revealHint}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Locations & Circuits */}
      <SectionCard title="Locations & Circuits">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Scavenging Locations ({HELP_LOCATIONS.length})
            </h3>
            <div className="mobile-natural-scroll mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
              {HELP_LOCATIONS.map((loc) => (
                <div key={loc.id} className="rounded border p-2 text-xs" style={{ borderColor: "var(--panel-border)" }}>
                  <div className="font-semibold" style={{ color: "var(--text-white)" }}>
                    T{loc.tier} · {loc.name}
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {loc.unlockCost > 0 ? `Costs ${formatNumber(loc.unlockCost)} Rep` : "Free"} · up to {loc.maxPartsPerScavenge} part(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Race Circuits ({HELP_CIRCUITS.length})
            </h3>
            <div className="mobile-natural-scroll mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
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
        <div className="mobile-natural-scroll max-h-64 space-y-1 overflow-y-auto pr-1">
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
