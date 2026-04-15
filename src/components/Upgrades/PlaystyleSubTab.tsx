"use client";

import { useGameStore } from "@/state/store";
import {
  PLAYSTYLE_PATHS,
  PLAYSTYLE_NODE_DEFINITIONS,
  PLAYSTYLE_NODES_BY_ID,
  canUnlockPlaystyleNode,
  getPlaystylePathRespecCost,
  type PlaystylePath,
  type PlaystyleNodeDefinition,
} from "@/data/playstyleUpgrades";

const PATH_EMOJI: Record<string, string> = {
  scrapper: "\uD83D\uDD0D",
  speedster: "\uD83C\uDFC1",
  engineer: "\uD83D\uDD27",
};

export default function PlaystyleSubTab() {
  const unlockedNodes = useGameStore((s) => s.unlockedPlaystyleNodes);
  const legacyPoints = useGameStore((s) => s.legacyPoints);
  const purchaseNode = useGameStore((s) => s.purchasePlaystyleNode);
  const respecPath = useGameStore((s) => s.respecPlaystylePath);

  return (
    <div className="flex flex-col gap-4">
      {/* LP Balance */}
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Playstyle Trees
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {legacyPoints} LP
        </span>
      </div>

      {/* 3-column tree layout */}
      <div className="grid grid-cols-3 gap-3">
        {PLAYSTYLE_PATHS.map((path) => (
          <PathColumn
            key={path.id}
            path={path}
            unlockedNodes={unlockedNodes}
            legacyPoints={legacyPoints}
            onPurchase={purchaseNode}
            onRespec={respecPath}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Path Column ──────────────────────────────────────────────────────────── */

function PathColumn({
  path,
  unlockedNodes,
  legacyPoints,
  onPurchase,
  onRespec,
}: {
  path: (typeof PLAYSTYLE_PATHS)[number];
  unlockedNodes: string[];
  legacyPoints: number;
  onPurchase: (nodeId: string) => void;
  onRespec: (path: PlaystylePath) => void;
}) {
  const pathNodes = PLAYSTYLE_NODE_DEFINITIONS.filter(
    (n) => n.path === path.id,
  );
  const t1 = pathNodes.filter((n) => n.tier === 1);
  const t2 = pathNodes.filter((n) => n.tier === 2);
  const t3 = pathNodes.filter((n) => n.tier === 3);
  const t4 = pathNodes.filter((n) => n.tier === 4);

  const invested = getPlaystylePathRespecCost(path.id, unlockedNodes);
  const hasNodesUnlocked = invested > 0;

  return (
    <div
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
      className="flex flex-col gap-2 rounded-lg border p-3"
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-lg">{PATH_EMOJI[path.id] ?? ""}</div>
        <div
          style={{ color: "var(--text-heading)" }}
          className="text-xs font-semibold uppercase tracking-widest"
        >
          {path.name}
        </div>
        <p
          style={{ color: "var(--text-secondary)" }}
          className="mt-0.5 text-[10px] leading-tight"
        >
          {path.description}
        </p>
      </div>

      {/* T1 */}
      {t1.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          unlockedNodes={unlockedNodes}
          legacyPoints={legacyPoints}
          onPurchase={onPurchase}
        />
      ))}

      {/* T2 — two mutually exclusive options with OR between them */}
      {t2.length === 2 && (
        <div className="flex items-stretch gap-1">
          <div className="flex-1 min-w-0">
            <NodeCard
              node={t2[0]}
              unlockedNodes={unlockedNodes}
              legacyPoints={legacyPoints}
              onPurchase={onPurchase}
              compact
            />
          </div>
          <div
            className="flex items-center shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-[9px] font-bold uppercase">OR</span>
          </div>
          <div className="flex-1 min-w-0">
            <NodeCard
              node={t2[1]}
              unlockedNodes={unlockedNodes}
              legacyPoints={legacyPoints}
              onPurchase={onPurchase}
              compact
            />
          </div>
        </div>
      )}

      {/* T3 — show based on T2 prereqs */}
      {t3.length === 2 && (
        <div className="flex items-stretch gap-1">
          <div className="flex-1 min-w-0">
            <NodeCard
              node={t3[0]}
              unlockedNodes={unlockedNodes}
              legacyPoints={legacyPoints}
              onPurchase={onPurchase}
              compact
            />
          </div>
          <div
            className="flex items-center shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-[9px] font-bold uppercase">OR</span>
          </div>
          <div className="flex-1 min-w-0">
            <NodeCard
              node={t3[1]}
              unlockedNodes={unlockedNodes}
              legacyPoints={legacyPoints}
              onPurchase={onPurchase}
              compact
            />
          </div>
        </div>
      )}

      {/* T4 Capstone */}
      {t4.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          unlockedNodes={unlockedNodes}
          legacyPoints={legacyPoints}
          onPurchase={onPurchase}
        />
      ))}

      {/* Respec button */}
      {hasNodesUnlocked && (
        <button
          onClick={() => onRespec(path.id)}
          style={{
            borderColor: "var(--panel-border)",
            color: "var(--text-secondary)",
          }}
          className="mt-1 rounded border px-2 py-1 text-[10px] transition-colors hover:opacity-80"
        >
          Respec {path.name} ({Math.floor(invested * 0.5)} LP refund)
        </button>
      )}
    </div>
  );
}

/* ── Node Card ────────────────────────────────────────────────────────────── */

type NodeStatus = "unlocked" | "available" | "locked" | "blocked";

function getNodeStatus(
  node: PlaystyleNodeDefinition,
  unlockedNodes: string[],
): NodeStatus {
  if (unlockedNodes.includes(node.id)) return "unlocked";
  if (
    node.mutuallyExclusiveWith &&
    unlockedNodes.includes(node.mutuallyExclusiveWith)
  )
    return "blocked";
  if (canUnlockPlaystyleNode(node.id, unlockedNodes)) return "available";
  return "locked";
}

function getLockReason(
  node: PlaystyleNodeDefinition,
  unlockedNodes: string[],
): string | null {
  if (
    node.mutuallyExclusiveWith &&
    unlockedNodes.includes(node.mutuallyExclusiveWith)
  ) {
    const blocker = PLAYSTYLE_NODES_BY_ID[node.mutuallyExclusiveWith];
    return `Blocked by ${blocker?.name ?? node.mutuallyExclusiveWith}`;
  }
  if (
    node.prerequisiteNodeId &&
    !unlockedNodes.includes(node.prerequisiteNodeId)
  ) {
    const prereq = PLAYSTYLE_NODES_BY_ID[node.prerequisiteNodeId];
    return `Requires ${prereq?.name ?? node.prerequisiteNodeId}`;
  }
  if (node.prerequisiteTier != null) {
    const hasTier = unlockedNodes.some((id) => {
      const other = PLAYSTYLE_NODES_BY_ID[id];
      return other && other.path === node.path && other.tier === node.prerequisiteTier;
    });
    if (!hasTier) return `Requires a Tier ${node.prerequisiteTier} node`;
  }
  return null;
}

function NodeCard({
  node,
  unlockedNodes,
  legacyPoints,
  onPurchase,
  compact,
}: {
  node: PlaystyleNodeDefinition;
  unlockedNodes: string[];
  legacyPoints: number;
  onPurchase: (nodeId: string) => void;
  compact?: boolean;
}) {
  const status = getNodeStatus(node, unlockedNodes);
  const lockReason = getLockReason(node, unlockedNodes);
  const canAfford = legacyPoints >= node.lpCost;

  const bg =
    status === "unlocked"
      ? "var(--accent-bg)"
      : "transparent";
  const border =
    status === "unlocked"
      ? "var(--accent-border)"
      : status === "available"
        ? "var(--accent)"
        : "var(--panel-border)";
  const opacity = status === "locked" || status === "blocked" ? 0.5 : 1;

  return (
    <div
      style={{
        background: bg,
        borderColor: border,
        opacity,
      }}
      className={`rounded-md border ${compact ? "p-1.5" : "p-2"}`}
    >
      {/* Name + checkmark */}
      <div className="flex items-start justify-between gap-1">
        <span
          style={{
            color:
              status === "blocked"
                ? "var(--text-muted)"
                : "var(--text-white)",
            textDecoration: status === "blocked" ? "line-through" : "none",
          }}
          className={`font-semibold leading-tight ${compact ? "text-[10px]" : "text-xs"}`}
        >
          {status === "unlocked" && "\u2713 "}
          {node.name}
        </span>
        {status !== "unlocked" && (
          <span
            style={{
              color:
                status === "available" && canAfford
                  ? "var(--accent)"
                  : "var(--text-muted)",
            }}
            className={`shrink-0 font-mono font-bold ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            {node.lpCost} LP
          </span>
        )}
      </div>

      {/* Description */}
      <p
        style={{ color: "var(--text-secondary)" }}
        className={`leading-tight mt-0.5 ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        {node.description}
      </p>

      {/* Lock reason */}
      {(status === "locked" || status === "blocked") && lockReason && (
        <p
          style={{ color: "var(--text-muted)" }}
          className={`italic mt-0.5 ${compact ? "text-[8px]" : "text-[9px]"}`}
        >
          {lockReason}
        </p>
      )}

      {/* Purchase button */}
      {status === "available" && (
        <button
          onClick={() => onPurchase(node.id)}
          disabled={!canAfford}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
          className={`mt-1 w-full rounded px-2 font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${compact ? "py-0.5 text-[9px]" : "py-1 text-[10px]"}`}
        >
          Unlock ({node.lpCost} LP)
        </button>
      )}
    </div>
  );
}
