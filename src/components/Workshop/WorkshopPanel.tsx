"use client";

import { getWorkshopUpgradePurchaseCost, useGameStore } from "@/state/store";
import { UPGRADE_DEFINITIONS, UPGRADE_CATEGORIES, type UpgradeCategory, type UpgradeDefinition } from "@/data/upgrades";
import { getProjectSlots, projectProgress, projectRemainingMs, type Project } from "@/engine/projects";
import { formatNumber, formatTime } from "@/utils/format";
import { formatSpendableRep } from "@/engine/repPurchase";
import RepUnlockControl from "@/components/ui/RepUnlockControl";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";

/** Names of the workshop lines this upgrade still needs at level 1, in order. */
function missingPrerequisites(def: UpgradeDefinition, workshopLevels: Record<string, number>): string[] {
  const required = [
    ...(def.unlockRequirement?.workshopUpgradeId ? [def.unlockRequirement.workshopUpgradeId] : []),
    ...(def.unlockRequirement?.workshopUpgradeIds ?? []),
  ];
  return required
    .filter((id) => (workshopLevels[id] ?? 0) < 1)
    .map((id) => UPGRADE_DEFINITIONS.find((u) => u.id === id)?.name ?? id);
}

export default function WorkshopPanel() {
  const gameState = useGameStore.getState();
  const scrapBucks = useGameStore((s) => s.scrapBucks);
  const repPoints = useGameStore((s) => s.repPoints);
  const workshopLevels = useGameStore((s) => s.workshopLevels);
  const projects = useGameStore((s) => s.projects);
  const crewRoster = useGameStore((s) => s.crewRoster);
  const slots = getProjectSlots({ workshopLevels, crewRoster });
  const queueFull = projects.length >= slots;
  const upgradeCosts = Object.fromEntries(
    UPGRADE_DEFINITIONS.map((upgrade) => [upgrade.id, getWorkshopUpgradePurchaseCost(gameState, upgrade.id) ?? 0]),
  );
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
  const cancelProject = useGameStore((s) => s.cancelProject);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-zinc-400" data-testid="workshop-spendable-rep">
        {formatSpendableRep(repPoints)} · Rep-priced lines charge their Rep once, with the first level.
      </div>
      <ProjectQueue projects={projects} slots={slots} cancelProject={cancelProject} />
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {UPGRADE_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat.id}
            label={cat.label}
            icon={cat.icon}
            scrapBucks={scrapBucks}
            repPoints={repPoints}
            workshopLevels={workshopLevels}
            projects={projects}
            queueFull={queueFull}
            upgradeCosts={upgradeCosts}
            purchaseUpgrade={purchaseUpgrade}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Running projects with their timers. Purchases pay now and land when the
 * timer passes; the timer keeps running while the tab is closed.
 */
function ProjectQueue({ projects, slots, cancelProject }: { projects: Project[]; slots: number; cancelProject: (id: string) => void }) {
  return (
    <Panel
      kicker="Projects"
      title="Queue"
      aside={<span className="text-xs" style={{ color: "var(--text-muted)" }} data-testid="project-queue-slots">{projects.length} / {slots} slots</span>}
      data-testid="project-queue"
    >
      {projects.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No project running. Buying a line starts one; it finishes on its own, even while you are away.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => {
            const remaining = projectRemainingMs(project);
            const percent = Math.round(projectProgress(project) * 100);
            return (
              <li key={project.id} className="rounded-md border p-2.5" style={{ borderColor: "var(--panel-border)" }} data-testid="project-item">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: "var(--text-heading)" }}>{project.label}</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }} data-testid="project-remaining">
                      {remaining > 0 ? `${formatTime(remaining)} left` : "Finishing on the next tick"}
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => cancelProject(project.id)} aria-label={`Cancel ${project.label}`}>
                    Cancel · 50% back
                  </Button>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--divider, rgba(255,255,255,.1))" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`${project.label} progress`}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: "var(--info, #3b82f6)" }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function CategoryCard({
  category,
  label,
  icon,
  scrapBucks,
  repPoints,
  workshopLevels,
  projects,
  queueFull,
  upgradeCosts,
  purchaseUpgrade,
}: {
  category: UpgradeCategory;
  label: string;
  icon: string;
  scrapBucks: number;
  repPoints: number;
  workshopLevels: Record<string, number>;
  projects: Project[];
  queueFull: boolean;
  upgradeCosts: Record<string, number>;
  purchaseUpgrade: (id: string) => void;
}) {
  const upgrades = UPGRADE_DEFINITIONS.filter((u) => u.category === category);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 sm:p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        <span>{icon}</span>
        {label}
      </h3>
      <div className="flex flex-col gap-2">
        {upgrades.map((upgrade) => {
          const level = workshopLevels[upgrade.id] ?? 0;
          const maxed = level >= upgrade.maxLevel;
          const missing = missingPrerequisites(upgrade, workshopLevels);
          const prereqsMet = missing.length === 0;
          const cost = maxed ? 0 : upgradeCosts[upgrade.id];
          const canAfford = scrapBucks >= cost;
          const repCost = level === 0 ? (upgrade.unlockRequirement?.repPoints ?? 0) : 0;
          const isRepPurchase = !maxed && repCost > 0;
          const project = projects.find((candidate) => candidate.kind === "upgrade" && candidate.upgradeId === upgrade.id);
          const blockedByQueue = !project && queueFull;

          return (
            <div
              key={upgrade.id}
              className={`rounded-md border p-2.5 sm:p-3 ${
                !prereqsMet
                  ? "border-zinc-800 bg-zinc-900/50 opacity-50"
                  : maxed
                    ? "border-green-800/50 bg-green-900/10"
                    : "border-zinc-700 bg-zinc-800/50"
              }`}
              data-testid={`workshop-line-${upgrade.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{upgrade.name}</span>
                    {project ? (
                      <span className="text-xs font-semibold" style={{ color: "var(--info, #3b82f6)" }} data-testid={`workshop-line-progress-${upgrade.id}`}>
                        In progress · {formatTime(projectRemainingMs(project))}
                      </span>
                    ) : (
                      <LevelPips level={level} max={upgrade.maxLevel} />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{upgrade.description}</p>
                  {!prereqsMet && (
                    <p className="mt-1 text-xs text-zinc-600">Requires: {missing.join(" + ")}</p>
                  )}
                  {isRepPurchase && !project && (
                    <RepUnlockControl
                      cost={repCost}
                      repPoints={repPoints}
                      suffix={`· $${formatNumber(cost)}`}
                      blockedReason={!prereqsMet ? `Requires ${missing.join(" + ")}` : blockedByQueue ? "Project queue is full" : undefined}
                      secondaryReason={canAfford ? undefined : `Need $${formatNumber(cost - scrapBucks)} more`}
                      onUnlock={() => purchaseUpgrade(upgrade.id)}
                      testId={`unlock-workshop-${upgrade.id}`}
                      tutorialTarget="workshop-upgrade-btn"
                    />
                  )}
                </div>
                <div className="shrink-0">
                  {prereqsMet && !maxed && !isRepPurchase && !project && (
                    <button
                      data-tutorial="workshop-upgrade-btn"
                      onClick={() => purchaseUpgrade(upgrade.id)}
                      disabled={!canAfford || blockedByQueue}
                      title={blockedByQueue ? "Project queue is full" : canAfford ? undefined : `Need $${formatNumber(cost - scrapBucks)} more`}
                      className="rounded border border-orange-600 px-2.5 py-1 text-xs font-semibold text-orange-400 transition-colors hover:bg-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ${formatNumber(cost)}
                    </button>
                  )}
                  {maxed && (
                    <span className="rounded bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-400">
                      MAX
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LevelPips({ level, max }: { level: number; max: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-3 rounded-sm ${
            i < level ? "bg-orange-500" : "bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
