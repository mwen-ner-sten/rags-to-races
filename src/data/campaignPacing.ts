/**
 * `scrap` is wall-clock time for mixed play (charter, 2026-09-04): 2-4 days at
 * four check-ins of ~15 min a day, measured by scripts/simulate-mixed-campaign.ts
 * and guarded by src/engine/__tests__/mixedCampaign.test.ts. The later layers
 * are still hours of play.
 */
export const CAMPAIGN_PACING_TARGETS_HOURS = {
  scrap: { min: 48, max: 96 },
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
