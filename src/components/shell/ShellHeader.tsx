"use client";

import { useGameStore } from "@/state/store";
import { getVehicleById } from "@/data/vehicles";
import type { TabId } from "@/components/navigation/tabs";
import Button from "@/components/ui/Button";
import Stat from "@/components/ui/Stat";
import VehicleTooltip from "@/components/VehicleTooltip";
import StatsTooltip from "@/components/StatsTooltip";

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  tagline: string;
  menuOpen: boolean;
  openMenu: () => void;
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.75l1.4 1.9 2.3-.5.5 2.3 1.9 1.4-1.9 1.4.5 2.3-2.3.5L8 14.25l-1.4-1.9-2.3-.5.5-2.3L2.9 8.2l1.9-1.4-.5-2.3 2.3-.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Compact top header shared by every theme: brand, prestige badge, active
 * vehicle + performance, fatigue/momentum, and the settings gear.
 */
export default function ShellHeader({ activeTab, setActiveTab, tagline, menuOpen, openMenu }: Props) {
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const garage = useGameStore((s) => s.garage);

  const activeVehicle = garage.find((v) => v.id === activeVehicleId);
  const vehicleDef = activeVehicle ? getVehicleById(activeVehicle.definitionId) : null;

  return (
    <header className="shell-header">
      <button className="shell-menu" data-tutorial="mobile-navigation" onClick={openMenu} aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="game-navigation"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
      <div className="shell-brand">
        <div className="shell-brand__name">Rags to Races</div>
        <div className="shell-brand__meta">
          <span className="shell-brand__tagline">{tagline}</span>
          {prestigeCount > 0 && (
            <span className="shell-prestige" title={`Prestige ${prestigeCount}`}>
              P{prestigeCount}
            </span>
          )}
        </div>
      </div>

      <div className="shell-header__data">
        {vehicleDef && activeVehicle && (
          <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
            <Stat
              className="shell-vehicle"
              align="right"
              size="sm"
              label={vehicleDef.name}
              value={`${Math.floor(activeVehicle.stats.performance)} PTS`}
              color="var(--text-white)"
            />
          </VehicleTooltip>
        )}
        <StatsTooltip />
        <Button
          variant="ghost"
          size="sm"
          className="shell-settings"
          active={activeTab === "settings"}
          aria-label="Settings"
          aria-current={activeTab === "settings" ? "page" : undefined}
          data-tutorial-tab="settings"
          onClick={() => setActiveTab("settings")}
        >
          <GearIcon />
        </Button>
      </div>
    </header>
  );
}
