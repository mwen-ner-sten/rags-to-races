export const CAMPAIGN_PACING_TARGETS_HOURS = {
  scrap: { min: 1, max: 2 },
  team: { min: 8, max: 15 },
  owner: { min: 30, max: 50 },
  track: { min: 80, max: 150 },
} as const;

export const DECISION_SESSION_TARGET_MINUTES = { min: 10, max: 20 } as const;

export type CampaignLayer = keyof typeof CAMPAIGN_PACING_TARGETS_HOURS;

export function isWithinCampaignPacingTarget(layer: CampaignLayer, elapsedHours: number): boolean {
  const target = CAMPAIGN_PACING_TARGETS_HOURS[layer];
  return elapsedHours >= target.min && elapsedHours <= target.max;
}
