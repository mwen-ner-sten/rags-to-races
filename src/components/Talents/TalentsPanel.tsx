"use client";

import { useGameStore } from "@/state/store";
import { TALENT_TREES, getTalentNodesForTree, type TalentNode } from "@/data/talentNodes";
import { parseAttributeEffectType, ATTRIBUTE_LABELS } from "@/data/gearAttributes";
import { formatNumber } from "@/utils/format";

function effectLabel(type: string, value: number): string {
  const attrId = parseAttributeEffectType(type);
  if (attrId) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value)} ${ATTRIBUTE_LABELS[attrId]}`;
  }
  const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
  switch (type) {
    case "scavenge_luck_bonus":      return `${pct(value)} scavenge luck`;
    case "scavenge_yield_pct":       return `${pct(value)} scavenge yield`;
    case "sell_value_bonus_pct":     return `${pct(value)} sell value`;
    case "race_performance_pct":     return `${pct(value)} race performance`;
    case "race_dnf_reduction":       return `${pct(value)} DNF reduction`;
    case "race_handling_pct":        return `${pct(value)} handling`;
    case "race_wear_reduction_pct":  return `${pct(value)} wear reduction`;
    case "race_scrap_bonus_pct":     return `${pct(value)} race scrap`;
    case "build_cost_reduction_pct":  return `${pct(value)} build cost`;
    case "repair_cost_reduction_pct": return `${pct(value)} repair cost`;
    case "refurb_cost_reduction_pct": return `${pct(value)} refurb cost`;
    case "fatigue_rate_reduction":    return `${pct(value)} less fatigue/race`;
    case "material_bonus_pct":        return `${pct(value)} decompose yield`;
    case "forge_token_chance_bonus":  return `${pct(value)} forge token chance`;
    default: return `${pct(value)} ${type}`;
  }
}

export default function TalentsPanel() {
  const unlockedTalentNodes = useGameStore((s) => s.unlockedTalentNodes);
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const unlockTalentNode = useGameStore((s) => s.unlockTalentNode);
  const respecTalentTree = useGameStore((s) => s.respecTalentTree);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="text-lg font-bold uppercase tracking-widest"
          style={{ color: "var(--text-heading, var(--accent, #c83e0c))" }}
        >
          Talents
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Invest Scrap Bucks into permanent passives. Paths branch at tier 2 — pick one
          direction. Respec a tree at any time for 1.5× what you spent. Talents persist
          through Scrap Reset.
        </p>
      </div>

      {TALENT_TREES.map((tree) => {
        const nodes = getTalentNodesForTree(tree.id).sort((a, b) => a.tier - b.tier);
        const tier1 = nodes.filter((n) => n.tier === 1);
        const tier2 = nodes.filter((n) => n.tier === 2);
        const tier3 = nodes.filter((n) => n.tier === 3);

        const unlockedInTree = nodes.filter((n) => unlockedTalentNodes.includes(n.id));
        const respecCost = Math.floor(unlockedInTree.reduce((s, n) => s + n.cost, 0) * 1.5);
        const canRespec = unlockedInTree.length > 0 && scrapBucks >= respecCost;
        const hasNodes = unlockedInTree.length > 0;

        return (
          <div key={tree.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{tree.icon}</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
                    {tree.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{tree.description}</p>
                </div>
              </div>
              {hasNodes && (
                <button
                  onClick={() => respecTalentTree(tree.id)}
                  disabled={!canRespec}
                  title={`Reset all ${tree.name} talents. Cost: $${formatNumber(respecCost)}`}
                  className="shrink-0 rounded border border-red-800 px-2 py-1 text-xs text-red-500 hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Respec (${formatNumber(respecCost)})
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {tier1.map((node) => (
                <TalentNodeRow
                  key={node.id}
                  node={node}
                  unlockedTalentNodes={unlockedTalentNodes}
                  scrapBucks={scrapBucks}
                  unlockTalentNode={unlockTalentNode}
                />
              ))}
            </div>

            {tier2.length > 0 && (
              <div className="mt-2">
                <SectionDivider label="Choose a Path" />
                <div className="flex flex-col gap-2">
                  {tier2.map((node) => {
                    const exclusiveUnlocked = node.mutuallyExclusiveWith
                      ? unlockedTalentNodes.includes(node.mutuallyExclusiveWith)
                      : false;
                    return (
                      <TalentNodeRow
                        key={node.id}
                        node={node}
                        unlockedTalentNodes={unlockedTalentNodes}
                        scrapBucks={scrapBucks}
                        unlockTalentNode={unlockTalentNode}
                        forceBlocked={exclusiveUnlocked}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {tier3.filter((n) => !n.prerequisiteNodeId || unlockedTalentNodes.includes(n.prerequisiteNodeId)).length > 0 && (
              <div className="mt-2">
                <SectionDivider label="Capstone" />
                <div className="flex flex-col gap-2">
                  {tier3
                    .filter((n) => !n.prerequisiteNodeId || unlockedTalentNodes.includes(n.prerequisiteNodeId))
                    .map((node) => (
                      <TalentNodeRow
                        key={node.id}
                        node={node}
                        unlockedTalentNodes={unlockedTalentNodes}
                        scrapBucks={scrapBucks}
                        unlockTalentNode={unlockTalentNode}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <div className="h-px flex-1 bg-zinc-800" />
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

function TalentNodeRow({
  node, unlockedTalentNodes, scrapBucks, unlockTalentNode, forceBlocked = false,
}: {
  node: TalentNode;
  unlockedTalentNodes: string[];
  scrapBucks: number;
  unlockTalentNode: (nodeId: string) => void;
  forceBlocked?: boolean;
}) {
  const unlocked = unlockedTalentNodes.includes(node.id);
  const meetsPrereq = !node.prerequisiteNodeId || unlockedTalentNodes.includes(node.prerequisiteNodeId);
  const available = meetsPrereq && !unlocked && !forceBlocked;
  const canAfford = scrapBucks >= node.cost;

  return (
    <div className={`flex items-start gap-3 rounded-md border p-2.5 transition-colors ${
      unlocked       ? "border-green-800/50 bg-green-900/10"
      : forceBlocked ? "border-zinc-800 bg-zinc-900/20 opacity-30"
      : available    ? "border-zinc-600 bg-zinc-800/50"
      : "border-zinc-800 bg-zinc-900/30 opacity-50"
    }`}>
      <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
        unlocked ? "border-green-500 bg-green-500"
        : forceBlocked ? "border-zinc-800"
        : available ? "border-zinc-500"
        : "border-zinc-700"
      }`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold ${unlocked ? "text-green-400" : forceBlocked ? "text-zinc-600" : "text-zinc-200"}`}>
            {node.name}
          </span>
          <span className="text-xs font-mono text-emerald-400">
            {effectLabel(node.effect.type, node.effect.value)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{node.description}</p>
      </div>
      {!unlocked && available && (
        <button
          onClick={() => unlockTalentNode(node.id)}
          disabled={!canAfford}
          className="shrink-0 rounded border border-orange-600 px-2 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ${formatNumber(node.cost)}
        </button>
      )}
      {unlocked && (
        <span className="shrink-0 text-xs text-green-500">Unlocked</span>
      )}
    </div>
  );
}
