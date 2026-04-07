"use client";

import {
  HELP_PARTS_BY_CATEGORY,
  HELP_CONDITIONS,
  HELP_MATERIAL_SOURCES,
  HELP_DATA_SNAPSHOT_EXTENDED,
} from "@/data/helpContent";
import { capitalize } from "@/utils/format";

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

export default function HelpReferenceTab() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Conditions */}
      <SectionCard title="Condition Multipliers">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {HELP_CONDITIONS.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>{capitalize(c.id)}</span>
              <span style={{ color: "var(--text-white)" }}>×{c.multiplier.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Multiplier affects part power, reliability, and sale value. Higher condition = stronger.
        </p>
      </SectionCard>

      {/* Parts by Category */}
      <SectionCard title="Parts by Category">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {HELP_PARTS_BY_CATEGORY.map((item) => (
            <div key={item.category} className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>{capitalize(item.category)}</span>
              <span style={{ color: "var(--text-white)" }}>{item.count}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Material Sources */}
      <SectionCard title="Material Sources">
        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Which materials you get when decomposing parts of each category.
        </p>
        <div className="space-y-1">
          {HELP_MATERIAL_SOURCES.filter((s) => s.materials.length > 0).map((s) => (
            <div key={s.category} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-primary)" }}>{capitalize(s.category)}</span>
              <span style={{ color: "var(--text-muted)" }}>{s.materials.map((m) => capitalize(m)).join(", ")}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Data Snapshot */}
      <SectionCard title="Data Snapshot">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {[
            { label: "Locations", value: HELP_DATA_SNAPSHOT_EXTENDED.locations },
            { label: "Circuits", value: HELP_DATA_SNAPSHOT_EXTENDED.circuits },
            { label: "Vehicles", value: HELP_DATA_SNAPSHOT_EXTENDED.vehicles },
            { label: "Parts", value: HELP_DATA_SNAPSHOT_EXTENDED.parts },
            { label: "Core Slots", value: HELP_DATA_SNAPSHOT_EXTENDED.coreSlots },
            { label: "Upgrades", value: HELP_DATA_SNAPSHOT_EXTENDED.upgrades },
            { label: "Gear Items", value: HELP_DATA_SNAPSHOT_EXTENDED.gear },
            { label: "Materials", value: HELP_DATA_SNAPSHOT_EXTENDED.materials },
            { label: "Challenges", value: HELP_DATA_SNAPSHOT_EXTENDED.challenges },
            { label: "Craft Recipes", value: HELP_DATA_SNAPSHOT_EXTENDED.craftRecipes },
            { label: "Talent Nodes", value: HELP_DATA_SNAPSHOT_EXTENDED.talentNodes },
            { label: "Legacy Upgrades", value: HELP_DATA_SNAPSHOT_EXTENDED.legacyUpgrades },
            { label: "Momentum Tiers", value: HELP_DATA_SNAPSHOT_EXTENDED.momentumTiers },
            { label: "Team Upgrades", value: HELP_DATA_SNAPSHOT_EXTENDED.teamUpgrades },
            { label: "Owner Upgrades", value: HELP_DATA_SNAPSHOT_EXTENDED.ownerUpgrades },
            { label: "Track Perks", value: HELP_DATA_SNAPSHOT_EXTENDED.trackPerks },
            { label: "Skills", value: HELP_DATA_SNAPSHOT_EXTENDED.skills },
            { label: "Attributes", value: HELP_DATA_SNAPSHOT_EXTENDED.attributes },
            { label: "Crew Roles", value: HELP_DATA_SNAPSHOT_EXTENDED.crewRoles },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              <span style={{ color: "var(--text-white)" }}>{item.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Auto-generated from game definitions — updates when data files change.
        </p>
      </SectionCard>
    </div>
  );
}
