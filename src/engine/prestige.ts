export interface PrestigeBonus {
  scrapMultiplier: number;
  luckBonus: number;
  repMultiplier: number;
  buildSpeedMultiplier: number;
}

/** Calculate permanent bonuses for a given prestige count */
export function calculatePrestigeBonus(prestigeCount: number): PrestigeBonus {
  const p = prestigeCount;
  return {
    scrapMultiplier: 1 + p * 0.25,
    luckBonus: Math.min(0.3, p * 0.03),
    repMultiplier: 1 + p * 0.15,
    buildSpeedMultiplier: 1 + p * 0.15,
  };
}

/** What you keep on a scrap reset */
export interface PrestigeKeep {
  prestigeCount: number;
  bonuses: PrestigeBonus;
}

/** Returns what carries over after prestige */
export function doPrestige(currentPrestigeCount: number): PrestigeKeep {
  const newCount = currentPrestigeCount + 1;
  return {
    prestigeCount: newCount,
    bonuses: calculatePrestigeBonus(newCount),
  };
}
