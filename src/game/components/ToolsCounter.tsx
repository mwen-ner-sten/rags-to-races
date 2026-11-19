"use client";

import { toolStocked } from "@/core/actions";
import { TOOLS } from "@/core/content/tools";
import type { GameState, MaterialId } from "@/core/types";
import { num } from "../format";
import { useGame } from "../store";
import { ChannelWhy } from "./ChannelWhy";

export function ToolsCounter({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const stocked = TOOLS.filter((tool) => toolStocked(game, tool.id));
  return (
    <section aria-labelledby="tools-h" className="section">
      <h2 id="tools-h">Tools counter</h2>
      <p className="sub">Bought with Scrap Bucks. They stay until the Season ends.</p>
      <div className="sub channel-line">
        <span>
          Bench speed <ChannelWhy game={game} channelId="bench_speed" />
        </span>
      </div>
      <div className="grid-list">
        {stocked.map((tool) => {
          const owned = game.run.tools[tool.id] ?? 0;
          const maxed = owned >= tool.max;
          const mats = Object.entries(tool.materials).map(([m, n]) => `${n} ${m}`);
          const missing = Object.entries(tool.materials).filter(([m, n]) => game.run.materials[m as MaterialId] < (n ?? 0));
          const short = game.run.cash < tool.cash || missing.length > 0;
          const reason = maxed
            ? null
            : game.run.cash < tool.cash
              ? `Needs ${num(tool.cash - game.run.cash)} more Scrap Bucks`
              : missing.length > 0
                ? `Needs more ${missing.map(([m]) => m).join(", ")}`
                : null;
          return (
            <div key={tool.id} className="row-card">
              <div>
                <strong>{tool.name}</strong> {tool.max > 1 && <span className="muted num">{owned}/{tool.max}</span>}
                <p className="blurb">{tool.blurb}</p>
              </div>
              <div className="row-action">
                <button className="btn wrap" disabled={maxed || short} onClick={() => dispatch({ type: "buyTool", toolId: tool.id })}>
                  {maxed ? "Owned" : `${num(tool.cash)} Scrap Bucks${mats.length ? ` + ${mats.join(", ")}` : ""}`}
                </button>
                {reason && <span className="why">{reason}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {stocked.length < TOOLS.length && <p className="muted small">Bigger shop tools turn up once you&apos;re building bigger machines.</p>}
    </section>
  );
}
