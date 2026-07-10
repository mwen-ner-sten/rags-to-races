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
  crew_system: { availability: "released", description: "Team-layer crew recruitment, development, and fleet assignment." },
  new_workshop_cats: { availability: "released", description: "Station Lab and advanced Salvage Workshop facilities." },
  advanced_circuits: { availability: "released", description: "Profiled Owner-layer international and endurance circuits." },
  fleet_garage: { availability: "released", description: "Passive programs for non-focus vehicles on completed circuits." },
  vehicle_mastery: { availability: "released", description: "Owner R&D access to T9 and T10 vehicles." },
  track_customization: { availability: "released", description: "Bounded owned-venue configuration and hosted events." },
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
