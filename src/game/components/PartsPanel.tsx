"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { channel } from "@/core/channels";
import { getPart } from "@/core/content/parts";
import { partSellValue, reservedPartUids } from "@/core/garage";
import { jobBlocker } from "@/core/jobs";
import type { GameState, JobSpec, PartInstance } from "@/core/types";
import { conditionName, num } from "../format";
import { partSprite } from "../sprites";
import { useGame } from "../store";

type BenchKind = "clean" | "repair" | "restore" | "strip";

function benchAction(game: GameState, part: PartInstance): { kind: BenchKind; label: string } | null {
  const order: { kind: BenchKind; label: string }[] = [
    { kind: "clean", label: "Clean" },
    { kind: "repair", label: "Repair" },
    { kind: "restore", label: "Restore" },
  ];
  for (const option of order) {
    if (!jobBlocker(game, { kind: option.kind, partUid: part.uid })) return option;
  }
  return null;
}

function benchHint(game: GameState, part: PartInstance): string | null {
  const def = getPart(part.partId);
  if (def.category === "junk") return "Junk: strip it for materials or sell it.";
  if (part.condition >= 4) return "Restored. As good as it gets.";
  const kind: BenchKind = part.condition <= 1 ? "clean" : part.condition === 2 ? "repair" : "restore";
  return jobBlocker(game, { kind, partUid: part.uid });
}

function PartRow({ game, part, reserved }: { game: GameState; part: PartInstance; reserved: boolean }) {
  const dispatch = useGame((s) => s.dispatch);
  const def = getPart(part.partId);
  const action = benchAction(game, part);
  const hint = action ? null : benchHint(game, part);
  const enqueue = (spec: JobSpec) => dispatch({ type: "enqueue", spec });
  return (
    <li className={`part ${reserved ? "busy" : ""}`}>
      <Image src={partSprite(part.partId)} alt="" width={40} height={40} />
      <div className="part-main">
        <div className="part-name">
          <strong>{def.name}</strong>
          <span className={`cond c${part.condition}`}>{conditionName(part.condition)}</span>
        </div>
        <div className="part-meta muted">
          <span>{def.category}</span>
          <span>T{def.tier}</span>
          {def.category !== "junk" && (
            <span className="num">
              P{def.power} H{def.handling} R{def.reliability} W{def.weight}
            </span>
          )}
          <span>from {part.origin}</span>
        </div>
        {hint && !reserved && <div className="why">{hint}</div>}
      </div>
      <div className="part-actions">
        {reserved ? (
          <span className="chip">On the bench</span>
        ) : (
          <>
            {action && (
              <button className="btn small primary" onClick={() => enqueue({ kind: action.kind, partUid: part.uid })}>
                {action.label}
              </button>
            )}
            <button className="btn small" onClick={() => enqueue({ kind: "strip", partUid: part.uid })} title="Break it down for materials">
              Strip
            </button>
            <button className="btn small" onClick={() => dispatch({ type: "sell", partUids: [part.uid] })}>
              Sell {num(partSellValue(game, part))}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export function PartsPanel() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const [filter, setFilter] = useState("all");
  const reserved = useMemo(() => (game ? reservedPartUids(game) : new Set<string>()), [game]);
  if (!game) return null;
  const storage = Math.floor(channel(game, "storage"));
  const parts = [...game.run.inventory]
    .filter((p) => filter === "all" || getPart(p.partId).category === filter)
    .sort((a, b) => getPart(b.partId).tier - getPart(a.partId).tier || b.condition - a.condition);
  const junk = game.run.inventory.filter((p) => getPart(p.partId).category === "junk" && !reserved.has(p.uid));
  const categories = [...new Set(game.run.inventory.map((p) => getPart(p.partId).category))];
  return (
    <section className="section" aria-labelledby="parts-h">
      <div className="section-head">
        <h2 id="parts-h">Parts</h2>
        <span className="num muted">
          {game.run.inventory.length}/{storage} spaces
        </span>
      </div>
      <p className="sub">
        Clean takes a part from Scrap or Rusted up a step. Repair takes it from Worn to Good. Restore takes it past Good. Strip turns it into materials. The dealer pays less for a part they’ve just bought a pile of.
      </p>
      <div className="toolbar">
        <label>
          <span className="sr-only">Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All parts</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {junk.length > 0 && (
          <button className="btn small" onClick={() => dispatch({ type: "sell", partUids: junk.map((p) => p.uid) })}>
            Sell all junk ({junk.length})
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
