"use client";

import { useGameStore } from "@/state/store";
import { halveUpgradeLevels } from "@/engine/campaign";
import type { ResetLayer } from "@/data/resetContracts";

export default function ResetRetentionPreview({ layer }: { layer: ResetLayer }) {
  const s = useGameStore();
  const levels = layer === "team" ? s.legacyUpgradeLevels : layer === "owner" ? s.teamUpgradeLevels : {};
  const kept = halveUpgradeLevels(levels);
  return <div className="my-3 space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
    <p>Keep all {s.lootGearInventory.length} gear pieces, including {Object.values(s.equippedLootGear).filter(Boolean).length} equipped pieces, {s.lootGearInventory.reduce((n, g) => n + g.mods.length, 0)} installed mods and {s.gearModInventory.length} spare mods.</p>
    <p>Keep {s.discoveredBlueprintIds.length} blueprint discoveries, {s.earnedAchievements.length} achievements, tutorial completion and lifetime history.</p>
    <p>Clear {s.garage.length} vehicles and {s.inventory.length} loose parts. End {s.projects.length} projects, {s.fleetAssignments.length} fleet assignments and {s.hostedEvents.length} series without completion rewards; paid costs are not refunded. Queued gear stays at its current level.</p>
    {Object.keys(levels).length > 0 && <p>Retained {layer === "team" ? "Legacy" : "Team"} levels: {Object.entries(levels).filter(([, n]) => n > 0).map(([id, n]) => `${id.replace(/_/g, " ")}: ${n} → ${kept[id] ?? 0}`).join("; ")}.</p>}
    <p>{layer === "scrap" ? `Keep ${s.legacyPoints} LP plus this award, Legacy upgrades, ` : "Clear lower-layer currency balances; keep "}{s.teamPoints} TP{layer === "owner" || layer === "track" ? " → 0" : ""}, {s.ownerPoints} OP{layer === "track" ? " → 0" : ""}, and {s.trackPrestigeTokens} PT, plus the displayed promotion award.</p>
    {(s.campaign.knowledge.team || layer !== "scrap") && <p>Permanent opening: Toolkit and Dirt Track. {(s.campaign.knowledge.owner || layer === "owner" || layer === "track") && "Auto-Repair and a second project slot also remain available."}</p>}
  </div>;
}
