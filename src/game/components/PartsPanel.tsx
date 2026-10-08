"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CONDITION_STAT, getPart } from "@/core/content/parts";
import { type BenchKind, DRIVEWAY_RULES, DRIVEWAY_SPACE, benchCost, conditionAfter, drivewayRule, garageSpace, partSellValue, reservedPartUids, saleQuote, stripYield, swapOutCandidate } from "@/core/garage";
import { baseDuration, jobBlocker, jobRate } from "@/core/jobs";
import type { Condition, DrivewayRule, GameState, JobSpec, MaterialId, PartInstance } from "@/core/types";
import { capitalize, conditionName, duration, num, pct } from "../format";
import { partSprite } from "../sprites";
import { useGame } from "../store";
import { Tips } from "./Tips";

const UPGRADES: { kind: Exclude<BenchKind, "strip">; label: string }[] = [
  { kind: "clean", label: "Clean" },
  { kind: "repair", label: "Repair" },
  { kind: "restore", label: "Restore" },
];

/** The condition ladder, with the bench job that climbs each step. */
const LADDER: { from: Condition; via: string }[] = [
  { from: 0, via: "Clean" },
  { from: 1, via: "Clean" },
  { from: 2, via: "Repair" },
  { from: 3, via: "Restore" },
  { from: 4, via: "" },
];

const WORKING: Partial<Record<JobSpec["kind"], string>> = {
  clean: "Cleaning",
  repair: "Repairing",
  restore: "Restoring",
  strip: "Stripping",
  assemble: "Going into a build",
};

const STAT_NAMES = [
  ["power", "Power"],
  ["handling", "Handling"],
  ["reliability", "Reliability"],
  ["weight", "Weight"],
] as const;

function materialList(materials: Partial<Record<MaterialId, number>>): string {
  return Object.entries(materials)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([m, n]) => `${n} ${m}`)
    .join(", ");
}

/** The next upgrade that can start right now. */
function nextUpgrade(game: GameState, part: PartInstance) {
  return UPGRADES.find((option) => !jobBlocker(game, { kind: option.kind, partUid: part.uid })) ?? null;
}

/** Why this part can't be upgraded right now (null when it can, or there's nothing to say). */
function upgradeHint(game: GameState, part: PartInstance): string | null {
  if (getPart(part.partId).category === "junk") return "Junk: strip it for materials or sell it.";
  if (part.condition >= 4) return "Restored. As good as it gets.";
  const kind: BenchKind = part.condition <= 1 ? "clean" : part.condition === 2 ? "repair" : "restore";
  const blocker = jobBlocker(game, { kind, partUid: part.uid });
  return blocker && `Can't ${kind} it yet: ${blocker.charAt(0).toLowerCase()}${blocker.slice(1)}.`;
}

/** What's happening to a part that's tied up in a job. */
function partWork(game: GameState, uid: string): { label: string; done: number; left: string | null } {
  const job = game.run.jobs.find((j) => ("partUid" in j.spec && j.spec.partUid === uid) || (j.spec.kind === "assemble" && Object.values(j.spec.partUids).includes(uid)));
  if (job) {
    const rate = jobRate(game, job, false);
    return { label: WORKING[job.spec.kind] ?? "Busy", done: 1 - job.remaining / job.duration, left: duration(job.remaining / Math.max(rate, 0.01)) };
  }
  return { label: "Queued, waiting for a free bench", done: 0, left: null };
}

function ActionButton({ label, time, detail, onClick, primary, title }: { label: string; time?: string; detail: string; onClick: () => void; primary?: boolean; title?: string }) {
  return (
    <button className={`btn small act ${primary ? "primary" : ""}`} onClick={onClick} title={title}>
      <span className="act-label">
        {label}
        {time && <span className="act-time num">{time}</span>}
      </span>
      <span className="act-detail">{detail}</span>
    </button>
  );
}

function PartStats({ part }: { part: PartInstance }) {
  const def = getPart(part.partId);
  if (def.category === "junk") return null;
  const stats = STAT_NAMES.filter(([key]) => def[key] !== 0);
  return (
    <div className="part-stats">
      {stats.map(([key, name]) => (
        <span key={key}>
          {name} <span className="num">{def[key]}</span>
        </span>
      ))}
      <span className="muted">
        {pct(CONDITION_STAT[part.condition])} of that while {conditionName(part.condition)}
      </span>
    </div>
  );
}

function BusyStatus({ game, part }: { game: GameState; part: PartInstance }) {
  const work = partWork(game, part.uid);
  return (
    <div className="part-busy">
      <div className="part-busy-head">
        <span>{work.label}</span>
        {work.left && <span className="num muted">{work.left} left</span>}
      </div>
      {work.left && (
        <div className="bar" role="progressbar" aria-label={work.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(work.done * 100)}>
          <span style={{ width: `${Math.min(100, work.done * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

interface PartProps {
  game: GameState;
  part: PartInstance;
  /** The part is waiting on the driveway rather than in the garage. */
  onDriveway?: boolean;
}

function PartActions({ game, part, onDriveway }: PartProps) {
  const dispatch = useGame((s) => s.dispatch);
  const upgrade = onDriveway ? null : nextUpgrade(game, part);
  const out = onDriveway ? swapOutCandidate(game) : null;
  const enqueue = (spec: JobSpec) => dispatch({ type: "enqueue", spec });
  const time = (kind: BenchKind) => duration(baseDuration(game, { kind, partUid: part.uid }));
  const strip = materialList(stripYield(part));
  const sell = partSellValue(game, part);
  return (
    <div className="part-actions">
      {onDriveway && (
        <button className="btn small act primary" disabled={!out} onClick={() => dispatch({ type: "swapIn", partUid: part.uid })} title="Bring it into the garage and put your cheapest part out here instead">
          <span className="act-label">Swap in</span>
          <span className="act-detail">{out ? `sends out ${getPart(out.partId).name} (${conditionName(out.condition)})` : "everything is on the bench"}</span>
        </button>
      )}
      {upgrade && (
        <ActionButton
          primary
          label={upgrade.label}
          time={time(upgrade.kind)}
          detail={[`to ${conditionName(conditionAfter(upgrade.kind, part.condition) ?? part.condition)}`, materialList(benchCost(part, upgrade.kind)) && `uses ${materialList(benchCost(part, upgrade.kind))}`].filter(Boolean).join(" · ")}
          title={`${upgrade.label} on a bench`}
          onClick={() => enqueue({ kind: upgrade.kind, partUid: part.uid })}
        />
      )}
      <ActionButton label="Strip" time={time("strip")} detail={`get ${strip}`} title="Break it down for materials. The part is gone." onClick={() => enqueue({ kind: "strip", partUid: part.uid })} />
      <ActionButton label="Sell" time="now" detail={`get ${num(sell)} Scrap Bucks`} title="Sell it to the dealer right now" onClick={() => dispatch({ type: "sell", partUids: [part.uid] })} />
    </div>
  );
}

function PartRow({ game, part, reserved, onDriveway }: PartProps & { reserved: boolean }) {
  const def = getPart(part.partId);
  const hint = reserved || onDriveway || nextUpgrade(game, part) ? null : upgradeHint(game, part);
  return (
    <li className={`part ${reserved ? "busy" : ""}`}>
      <Image src={partSprite(part.partId)} alt="" width={40} height={40} />
      <div className="part-main">
        <div className="part-name">
          <strong>{def.name}</strong>
          <span className={`cond c${part.condition}`}>{conditionName(part.condition)}</span>
        </div>
        <div className="part-meta muted">
          <span>{capitalize(def.category)}</span>
          <span>Tier {def.tier}</span>
          <span>from {part.origin}</span>
        </div>
        <PartStats part={part} />
        {hint && <div className="why">{hint}</div>}
      </div>
      {reserved ? <BusyStatus game={game} part={part} /> : <PartActions game={game} part={part} onDriveway={onDriveway} />}
    </li>
  );
}

function ConditionLadder() {
  return (
    <ol className="ladder" aria-label="Part conditions, worst to best">
      {LADDER.map(({ from, via }) => (
        <li key={from}>
          <span className={`cond c${from}`}>{conditionName(from)}</span>
          <span className="num muted ladder-pct">{pct(CONDITION_STAT[from])}</span>
          {via && <span className="ladder-step">{via} →</span>}
        </li>
      ))}
    </ol>
  );
}

function SpaceMeter({ game }: { game: GameState }) {
  const used = game.run.inventory.length;
  const space = garageSpace(game);
  const full = used >= space;
  return (
    <div className={`space-meter ${full ? "full" : ""}`}>
      <span className="num">
        {used}/{space} spaces
      </span>
      <div className="bar small" role="meter" aria-label="Garage space used" aria-valuemin={0} aria-valuemax={space} aria-valuenow={used}>
        <span style={{ width: `${Math.min(100, (used / Math.max(1, space)) * 100)}%` }} />
      </div>
      {full && <span className="space-note">Full. New finds wait on the driveway.</span>}
    </div>
  );
}

function RulePicker({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  if (!game.run.learned.includes("tech:sorting")) return null;
  return (
    <label className="rule-picker">
      <span>When the driveway overflows:</span>
      <select value={drivewayRule(game)} onChange={(e) => dispatch({ type: "setDrivewayRule", rule: e.target.value as DrivewayRule })}>
        {DRIVEWAY_RULES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function DrivewaySection({ game, reserved }: { game: GameState; reserved: Set<string> }) {
  const parts = game.run.driveway;
  if (parts.length === 0) return null;
  const rule = DRIVEWAY_RULES.find((r) => r.id === drivewayRule(game));
  const canChoose = game.run.learned.includes("tech:sorting") || game.run.available.includes("tech:sorting");
  return (
    <div className="driveway" aria-labelledby="driveway-h">
      <div className="section-head">
        <h3 id="driveway-h">Driveway</h3>
        <span className="num muted">
          {parts.length}/{DRIVEWAY_SPACE} waiting
        </span>
      </div>
      <p className="sub">
        These didn’t fit in the garage. They move in by themselves, best first, as soon as space frees up. Until then you can swap one in, strip it or sell it. If more than {DRIVEWAY_SPACE} pile up, {rule?.text}.
        {canChoose && !game.run.learned.includes("tech:sorting") && " Study Sorting in the Notebook to choose what happens instead."}
      </p>
      <RulePicker game={game} />
      <ul className="parts">
        {parts.map((p) => (
          <PartRow key={p.uid} game={game} part={p} reserved={reserved.has(p.uid)} onDriveway />
        ))}
      </ul>
    </div>
  );
}

export function PartsPanel() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const [filter, setFilter] = useState("all");
  const reserved = useMemo(() => (game ? reservedPartUids(game) : new Set<string>()), [game]);
  if (!game) return null;
  const parts = [...game.run.inventory]
    .filter((p) => filter === "all" || getPart(p.partId).category === filter)
    .sort((a, b) => getPart(b.partId).tier - getPart(a.partId).tier || b.condition - a.condition);
  const junk = game.run.inventory.filter((p) => getPart(p.partId).category === "junk" && !reserved.has(p.uid));
  const junkValue = saleQuote(game, junk);
  const categories = [...new Set(game.run.inventory.map((p) => getPart(p.partId).category))];
  return (
    <section className="section" aria-labelledby="parts-h">
      <div className="section-head">
        <h2 id="parts-h">Parts</h2>
        <SpaceMeter game={game} />
      </div>
      <Tips ids={["garage", "driveway", "materials"]} />
      <DrivewaySection game={game} reserved={reserved} />
      <ConditionLadder />
      <p className="sub">
        The percentage is how much of a part’s stats it gives on the track. Strip breaks a part down into the materials Repair and Restore use. The dealer pays less for a part they’ve just bought a pile of.
      </p>
      <div className="toolbar">
        <label>
          <span className="sr-only">Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All parts</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {capitalize(c)}
              </option>
            ))}
          </select>
        </label>
        {game.run.driveway.length === 0 && <RulePicker game={game} />}
        {junk.length > 0 && (
          <button className="btn small" onClick={() => dispatch({ type: "sell", partUids: junk.map((p) => p.uid) })}>
            Sell all junk ({junk.length}) for {num(junkValue)} Scrap Bucks
          </button>
        )}
      </div>
      {parts.length === 0 ? (
        <p className="empty">Nothing in the garage. Take a trip.</p>
      ) : (
        <ul className="parts">
          {parts.map((p) => (
            <PartRow key={p.uid} game={game} part={p} reserved={reserved.has(p.uid)} />
          ))}
        </ul>
      )}
    </section>
  );
}
