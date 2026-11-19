"use client";

import { useState, type KeyboardEvent } from "react";
import { hasPerk } from "@/core/rules";
import type { GameState } from "@/core/types";
import { useGame } from "../store";
import { HeritageDesk } from "./HeritageDesk";
import { KnowhowList } from "./KnowhowList";
import { PartsCounter } from "./PartsCounter";
import { ShopUpgrades } from "./ShopUpgrades";
import { SwapMeet } from "./SwapMeet";
import { Tips } from "./Tips";
import { ToolsCounter } from "./ToolsCounter";
import { experimentalCareers } from "@/core/features";

const SECTIONS = ["Know-how", "Tools", "Parts counter", "Swap meet", "Shop upgrades", "Heritage"] as const;
type WorkshopSection = (typeof SECTIONS)[number];

/** Which Workshop sections have opened: each one appears with the system it belongs to. */
export function workshopSections(game: GameState): WorkshopSection[] {
  const revealed = (key: string) => game.run.revealed.includes(key);
  const open: Record<WorkshopSection, boolean> = {
    "Know-how": revealed("knowhow"),
    Tools: revealed("tools"),
    "Parts counter": revealed("tools"),
    "Swap meet": hasPerk(game, "swap_meet"),
    "Shop upgrades": game.era !== null,
    Heritage: experimentalCareers() && (!!game.run.heritageProject || !!game.meta.heritageRegister?.length),
  };
  return SECTIONS.filter((name) => open[name]);
}

export function WorkshopPanel({ section, vehicleUid }: { section?: "Heritage"; vehicleUid?: string }) {
  const game = useGame((s) => s.game);
  const [picked, setPicked] = useState<WorkshopSection | null>(section ?? null);
  if (!game) return null;
  const sections = workshopSections(game);
  const tab = picked && sections.includes(picked) ? picked : sections[0];
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 || !tab) return;
    e.preventDefault();
    const next = sections[(sections.indexOf(tab) + step + sections.length) % sections.length];
    setPicked(next);
    document.getElementById(`ws-tab-${next}`)?.focus();
  };
  return (
    <div className="panel">
      <section className="section" aria-labelledby="workshop-h">
        <h2 id="workshop-h">Workshop</h2>
        <p className="sub">Everything that makes you better at the work: what you can learn, and what you can buy.</p>
        <Tips ids={["knowhow", "tools"]} />
        <div className="subtabs" role="tablist" aria-label="Workshop sections" onKeyDown={onTabKey}>
          {sections.map((s) => (
            <button key={s} role="tab" id={`ws-tab-${s}`} aria-controls="ws-panel" aria-selected={tab === s} tabIndex={tab === s ? 0 : -1} className={tab === s ? "on" : ""} onClick={() => setPicked(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>
      <div role="tabpanel" id="ws-panel" aria-labelledby={tab ? `ws-tab-${tab}` : undefined}>
        {tab === "Know-how" && <KnowhowList game={game} />}
        {tab === "Tools" && <ToolsCounter game={game} />}
        {tab === "Parts counter" && <PartsCounter game={game} />}
        {tab === "Swap meet" && <SwapMeet game={game} />}
        {tab === "Shop upgrades" && <ShopUpgrades game={game} />}
        {tab === "Heritage" && <HeritageDesk game={game} vehicleUid={vehicleUid} />}
      </div>
    </div>
  );
}
