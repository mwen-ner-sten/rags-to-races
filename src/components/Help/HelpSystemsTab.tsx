"use client";

import {
  HELP_RACING,
  HELP_DEALER,
  HELP_UPGRADES_BY_CATEGORY,
  HELP_MATERIALS,
  HELP_CRAFT_RECIPES,
  MOMENTUM_TIERS,
  LEGACY_UPGRADE_DEFINITIONS,
  LEGACY_CATEGORY_LABELS,
  TALENT_TREES,
  TALENT_NODES,
  HELP_GEAR_STATS,
  HELP_DATA_SNAPSHOT,
  type LegacyUpgradeCategory,
} from "@/data/helpContent";
import { formatNumber, capitalize } from "@/utils/format";

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

function SystemSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <details className="rounded border" style={{ borderColor: "var(--panel-border)" }}>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold" style={{ color: "var(--text-white)" }}>
        <span>{icon}</span>
        <span>{title}</span>
      </summary>
      <div className="border-t px-3 py-3 text-xs" style={{ borderColor: "var(--panel-border)", color: "var(--text-secondary)" }}>
        {children}
      </div>
    </details>
  );
}

function Formula({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="my-2 rounded border px-3 py-2" style={{ borderColor: "var(--panel-border)", background: "var(--input-bg, rgba(0,0,0,0.2))" }}>
      <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</div>
      <code className="text-xs" style={{ color: "var(--accent)" }}>{formula}</code>
    </div>
  );
}

export default function HelpSystemsTab() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionCard title="Game Systems">
        <div className="space-y-2">
          {/* Racing */}
          <SystemSection icon="🏁" title="Racing">
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Win Chance</p>
                <Formula label="Formula" formula="min(95%, max(5%, performance / (difficulty × 2) + momentum bonus))" />
                <p>Fatigue reduces effective performance by 0.5% per point. Gear and prestige bonuses multiply performance.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>DNF (Did Not Finish)</p>
                <Formula label="Formula" formula="max(0%, 30% − reliability / 200 − gear DNF reduction)" />
                <p>At 60+ reliability, DNF chance hits 0%. Gear and the Smooth Lines talent reduce it further.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Vehicle Wear</p>
                <p>Base wear: {HELP_RACING.baseWearPerRace}/race. DNF adds bonus wear. Vehicles above {HELP_RACING.reliabilityWearThreshold} reliability take reduced wear. Fatigue adds +0.8% wear per point.</p>
                <p className="mt-1">Vehicle condition below {HELP_RACING.conditionPenaltyThreshold} causes stat penalties — repair in the Garage.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Drops</p>
                <p>Wins: 15% chance for a salvage part. ~2% Forge Token chance on tier 3+ circuits. Loot gear drops: 8% on win, 3% on loss, 1% on DNF.</p>
              </div>
            </div>
          </SystemSection>

          {/* Fatigue */}
          <SystemSection icon="💤" title="Fatigue">
            <div className="space-y-2">
              <p>Fatigue increases by 1 per race (0–99). It penalizes everything:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li><strong>Performance:</strong> −0.5% per point (at 50 fatigue = −25%)</li>
                <li><strong>Vehicle wear:</strong> +0.8% per point</li>
                <li><strong>Repair costs:</strong> +0.3% per point</li>
              </ul>
              <p className="mt-2">Fatigue resets to 0 on prestige. The Iron Will legacy upgrade delays the fatigue curve by 5 races per level. The Fatigue Proof talent reduces gain by 20%.</p>
              <p>Momentum bonuses <em>reward</em> pushing through fatigue — Deep Run (+50% LP at 60) and Legendary Run (+100% LP at 80).</p>
            </div>
          </SystemSection>

          {/* Prestige & Legacy */}
          <SystemSection icon="♻️" title="Prestige & Legacy">
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>What Resets</p>
                <p>Scrap Bucks, Rep, inventory, vehicles, workshop levels, materials, race history, momentum, fatigue.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>What Persists</p>
                <p>Legacy Points, legacy upgrades, talent nodes, all gear (static + loot), prestige count.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>LP Formula</p>
                <Formula label="Components" formula="(√(lifetime scrap / 100) + 3 × log₂(1 + races / 10)) × tier mult × fatigue floor × workshop bonus" />
                <p>Need ~30 fatigue for full LP efficiency. Higher circuit tiers and more workshop upgrades multiply LP.</p>
              </div>
              <div>
                <p className="mb-2 font-semibold" style={{ color: "var(--text-white)" }}>Legacy Upgrades ({LEGACY_UPGRADE_DEFINITIONS.length})</p>
                {(["velocity", "fortune", "endurance", "mastery"] as LegacyUpgradeCategory[]).map((cat) => {
                  const upgrades = LEGACY_UPGRADE_DEFINITIONS.filter((u) => u.category === cat);
                  return (
                    <div key={cat} className="mb-2">
                      <div className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                        {LEGACY_CATEGORY_LABELS[cat]}
                      </div>
                      {upgrades.map((u) => (
                        <div key={u.id} className="mt-1 flex justify-between">
                          <span style={{ color: "var(--text-primary)" }}>{u.name} <span style={{ color: "var(--text-muted)" }}>({u.maxLevel} lvl)</span></span>
                          <span style={{ color: "var(--text-muted)" }}>{u.baseCost} LP base</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="mb-2 font-semibold" style={{ color: "var(--text-white)" }}>Momentum Tiers</p>
                {MOMENTUM_TIERS.map((tier) => (
                  <div key={tier.id} className="mt-1 flex justify-between">
                    <span style={{ color: "var(--text-primary)" }}>{tier.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{tier.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </SystemSection>

          {/* Talent Tree */}
          <SystemSection icon="🌳" title="Talent Tree">
            <div className="space-y-3">
              <p>{TALENT_TREES.length} independent trees. Each has 3 tiers with mutually exclusive branches at tiers 2 and 3. Costs: 200 → 600 → 1,800 LP.</p>
              {TALENT_TREES.map((tree) => {
                const nodes = TALENT_NODES.filter((n) => n.treeId === tree.id).sort((a, b) => a.tier - b.tier);
                return (
                  <div key={tree.id} className="rounded border p-2" style={{ borderColor: "var(--panel-border)" }}>
                    <div className="text-xs font-semibold" style={{ color: "var(--text-white)" }}>
                      {tree.icon} {tree.name}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {nodes.map((node) => (
                        <div key={node.id} className="flex justify-between">
                          <span style={{ color: "var(--text-primary)" }}>
                            T{node.tier}: {node.name}
                            {node.mutuallyExclusiveWith && (
                              <span style={{ color: "var(--text-muted)" }}> (exclusive)</span>
                            )}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>{formatNumber(node.cost)} LP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SystemSection>

          {/* Gear & Loot */}
          <SystemSection icon="🎒" title="Gear & Loot">
            <div className="space-y-2">
              <p>{HELP_GEAR_STATS.totalGear} gear items across {HELP_GEAR_STATS.slotCount} slots (head, body, hands, feet, tool, accessory).</p>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Static Gear</p>
                <p>Bought with Scrap Bucks, 5 tiers (0–4). Higher tiers unlock at Rep thresholds.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Loot Gear</p>
                <p>Drops from races/scavenging. Rarity: Common → Uncommon → Rare → Epic → Legendary. Higher rarities have stronger base effects.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Enhancement</p>
                <p>Each level adds +12% to effect values. Mod slots unlock at levels 3 and 7. Base max level is 4, +3 per Enhancement Mastery workshop upgrade (hard cap 13).</p>
                <Formula label="Cost" formula="floor(baseCost × (level + 1)^1.8)" />
                <p>Base cost by rarity: Common 50, Uncommon 150, Rare 500, Epic 2,000, Legendary 10,000.</p>
              </div>
              <div>
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Drop Rates</p>
                <p>Scavenge: 3% base. Race win: 8%. Race loss: 3%. DNF: 1%. Win streaks add +0.5%/win (cap +10%).</p>
              </div>
              <p>All gear persists through prestige — invest early for compounding returns.</p>
            </div>
          </SystemSection>

          {/* Workshop */}
          <SystemSection icon="⚙️" title="Workshop">
            <div className="space-y-3">
              <p>{HELP_DATA_SNAPSHOT.upgrades} upgrades across {HELP_DATA_SNAPSHOT.upgradeCategories} categories. Workshop levels reset on prestige.</p>
              {HELP_UPGRADES_BY_CATEGORY.map((group) => (
                <div key={group.category}>
                  <div className="text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{group.label}</div>
                  {group.upgrades.map((u) => (
                    <div key={u.id} className="mt-1 flex justify-between">
                      <span style={{ color: "var(--text-primary)" }}>{u.name} <span style={{ color: "var(--text-muted)" }}>({u.maxLevel} lvl)</span></span>
                      <span style={{ color: "var(--text-muted)" }}>{formatNumber(u.baseCost)} base</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </SystemSection>

          {/* Crafting & Materials */}
          <SystemSection icon="🔨" title="Crafting & Materials">
            <div className="space-y-2">
              <p>{HELP_MATERIALS.length} material types gained by decomposing parts. Used for gear enhancement and crafting.</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {HELP_MATERIALS.map((m) => (
                  <span key={m.id} className="rounded border px-2 py-1 text-center text-xs" style={{ borderColor: "var(--panel-border)", color: "var(--text-primary)" }}>
                    {m.name}
                  </span>
                ))}
              </div>
              <div className="mt-2">
                <p className="mb-1 font-semibold" style={{ color: "var(--text-white)" }}>Craft Recipes ({HELP_CRAFT_RECIPES.length})</p>
                <p>Unlocked via the Parts Bin workshop upgrade (~15k Rep). Two tiers per part category — basic (worn) and refined (decent).</p>
                {HELP_CRAFT_RECIPES.map((r) => (
                  <div key={r.id} className="mt-1 flex justify-between">
                    <span style={{ color: "var(--text-primary)" }}>{r.label}</span>
                    <span style={{ color: "var(--text-muted)" }}>{capitalize(r.resultCondition)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2">Decompose yield scales with part condition and is reduced by fatigue. High-condition parts give 2–4× more materials than rusted ones.</p>
            </div>
          </SystemSection>

          {/* Dealer */}
          <SystemSection icon="🏪" title="Dealer">
            <div className="space-y-2">
              <p>Unlocks at {formatNumber(HELP_DEALER.unlockRep)} Rep. Shows {HELP_DEALER.boardSize} rotating part listings, refreshing every {HELP_DEALER.refreshInterval} ticks.</p>
              <ul className="list-disc space-y-1 pl-4">
                <li><strong>{formatNumber(HELP_DEALER.unlockRep)} Rep:</strong> Tier 1 parts, decent–good conditions</li>
                <li><strong>{formatNumber(HELP_DEALER.tier2Rep)} Rep:</strong> Tier 1–2 parts, up to pristine conditions</li>
                <li><strong>{formatNumber(HELP_DEALER.tier3Rep)} Rep:</strong> Tier 1–4 parts, all conditions available</li>
              </ul>
              <p>Dealer refreshes can be earned as challenge rewards.</p>
            </div>
          </SystemSection>
        </div>
      </SectionCard>
    </div>
  );
}
