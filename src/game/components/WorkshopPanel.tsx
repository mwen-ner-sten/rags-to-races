"use client";

import { useState } from "react";
import { hasPerk } from "@/core/rules";
import type { GameState } from "@/core/types";
import { useGame } from "../store";
import { HeritageDesk } from "./HeritageDesk";
import { KnowhowList } from "./KnowhowList";
import { PartsCounter } from "./PartsCounter";
import { ShopUpgrades } from "./ShopUpgrades";
import { SubNav } from "./SubNav";
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
  return (
    <div className="panel">
      <section className="section" aria-labelledby="workshop-h">
        <h2 id="workshop-h">Workshop</h2>
        <p className="sub">Everything that makes you better at the work: what you can learn, and what you can buy.</p>
        <Tips ids={["knowhow", "tools"]} />
        {tab && <SubNav idPrefix="ws" label="Workshop sections" items={sections.map((id) => ({ id, label: id }))} value={tab} onChange={setPicked} />}
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
