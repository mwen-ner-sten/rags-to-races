export type Availability = "experimental" | "dev" | "uat" | "released";

export type FeatureId =
  | "racer_attributes"
  | "expanded_talents"
  | "crew_system"
  | "new_workshop_cats"
  | "advanced_circuits"
  | "fleet_garage"
  | "vehicle_mastery"
  | "track_customization"
  | "admin_tools"
  | "design_mock"
  | "balance_visualizer"
  | "save_recovery";

export interface FeatureAvailability {
  availability: Availability;
  description: string;
}

/**
 * The sole release-visibility catalog. Progression unlocks decide when a player
 * earns a shipped feature; this catalog decides which deployments may expose it.
 */
export const FEATURE_AVAILABILITY: Record<FeatureId, FeatureAvailability> = {
  racer_attributes: { availability: "dev", description: "Legacy assignable racer attributes pending crew migration." },
  expanded_talents: { availability: "dev", description: "Legacy talent expansion pending Garage Philosophy migration." },
  crew_system: { availability: "dev", description: "Crew system pending complete Team-layer gameplay." },
  new_workshop_cats: { availability: "dev", description: "Workshop categories pending station conversion." },
  advanced_circuits: { availability: "dev", description: "Owner circuits pending complete profiles and art." },
  fleet_garage: { availability: "dev", description: "Fleet assignments pending passive-program implementation." },
  vehicle_mastery: { availability: "dev", description: "T9/T10 vehicles pending Owner facilities and art." },
  track_customization: { availability: "dev", description: "Track ownership pending bounded venue configuration." },
  admin_tools: { availability: "dev", description: "Developer fixtures and balancing controls." },
  design_mock: { availability: "experimental", description: "Non-gameplay visual exploration route." },
  balance_visualizer: { availability: "dev", description: "Developer balance visualizer." },
  save_recovery: { availability: "released", description: "Versioned saves, migrations, and recovery backups." },
};

const AVAILABILITY_RANK: Record<Availability, number> = {
  experimental: 0,
  dev: 1,
  uat: 2,
  released: 3,
};

export const RELEASE_CHANNEL = (process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "dev") as Availability;

export function isFeatureAvailable(
  featureId: FeatureId,
  channel: Availability = RELEASE_CHANNEL,
): boolean {
  return AVAILABILITY_RANK[FEATURE_AVAILABILITY[featureId].availability] >= AVAILABILITY_RANK[channel];
}
