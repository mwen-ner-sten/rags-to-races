"use client";

import { experimentalCareers } from "@/core/features";
import type { CareerDestination } from "@/core/careerAdvice";
import { motorPoolVisible } from "@/core/motorPool";
import type { GameState } from "@/core/types";
import { BuildPanel } from "./BuildPanel";
import { ManufacturerPanel } from "./ManufacturerPanel";
import { MotorPoolPanel } from "./MotorPoolPanel";
import { PartsPanel } from "./PartsPanel";
import { ServiceCounter, serviceActionReady, serviceCounterVisible } from "./ServiceCounter";
import { SubNav, subNavTabId, type SubNavItem } from "./SubNav";
import { hasUnreadTip } from "./Tips";

export type GarageSection = "vehicles" | "parts" | "customers" | "depot" | "works";

type GarageJump = Extract<CareerDestination, { tab: "garage" }>["section"];

const JUMP_SECTION: Record<GarageJump, GarageSection> = {
  works: "works",
  "works-deal": "works",
  build: "vehicles",
  parts: "parts",
  service: "customers",
  "service-delivery": "customers",
  "motor-pool": "depot",
  "motor-pickup": "depot",
};

/** Which Garage section holds a career-jump target. */
export function garageSectionFor(jump: GarageJump): GarageSection {
  return JUMP_SECTION[jump];
}

const ID_PREFIX = "garage";

/** The sections this player has opened so far, in the order they are shown. */
function garageSections(game: GameState): SubNavItem<GarageSection>[] {
  const run = game.run;
  const items: (SubNavItem<GarageSection> | false)[] = [
    (run.vehicles.length > 0 || run.revealed.includes("build")) && {
      id: "vehicles",
      label: "Vehicles",
      dot: hasUnreadTip(game, ["build", "venues", "street_stock"]),
      dotLabel: "New tip",
    },
    {
      id: "parts",
      label: "Parts",
      badge: run.driveway.length,
      dot: hasUnreadTip(game, ["garage", "materials", "driveway"]),
      dotLabel: "New tip",
    },
    serviceCounterVisible(game) && {
      id: "customers",
      label: "Customers",
      dot: serviceActionReady(game),
      dotLabel: "A customer job is ready",
    },
    motorPoolVisible(game) && {
      id: "depot",
      label: "Depot",
      dot: !!game.motorPool?.claim,
      dotLabel: "A depot pickup is waiting",
    },
    experimentalCareers() && !!game.manufacturer?.invites.length && { id: "works", label: "Suppliers" },
  ];
  return items.filter((item): item is SubNavItem<GarageSection> => !!item);
}

/** Where the Garage opens: until there is a vehicle to look at, the parts are the garage. */
export function openingGarageSection(game: GameState): GarageSection {
  return game.run.vehicles.length > 0 ? "vehicles" : "parts";
}

interface GarageTabProps {
  game: GameState;
  /** The section the player last chose, or null to open on the first one. */
  section: GarageSection | null;
  onSection: (section: GarageSection) => void;
}

/** The Garage: one job per section. It opens on your vehicles once you have one. */
export function GarageTab({ game, section, onSection }: GarageTabProps) {
  const items = garageSections(game);
  const active = section && items.some((item) => item.id === section) ? section : openingGarageSection(game);
  const showNav = items.length > 1;
  return (
    <div className="panel">
      {showNav && <SubNav idPrefix={ID_PREFIX} label="Garage sections" items={items} value={active} onChange={onSection} />}
      <div
        id={`${ID_PREFIX}-panel`}
        role={showNav ? "tabpanel" : undefined}
        aria-labelledby={showNav ? subNavTabId(ID_PREFIX, active) : undefined}
      >
        {active === "vehicles" && <BuildPanel />}
        {active === "parts" && <PartsPanel />}
        {active === "customers" && <ServiceCounter game={game} />}
        {active === "depot" && <MotorPoolPanel game={game} onManageParts={() => onSection("parts")} />}
        {active === "works" && <ManufacturerPanel game={game} />}
      </div>
    </div>
  );
}
