export type AttributeName = "reflexes" | "endurance" | "charisma" | "instinct" | "engineering" | "fortune";

export interface AttributeDefinition {
  id: AttributeName;
  name: string;
  icon: string;
  description: string;
  ratingType: string;
  ratingPerPoint: number;
  flatBonuses?: { type: string; valuePerPoint: number }[];
}

export interface RacerAttributes {
  reflexes: number;
  endurance: number;
  charisma: number;
  instinct: number;
  engineering: number;
  fortune: number;
}

export function createDefaultAttributes(): RacerAttributes {
  return {
    reflexes: 0,
    endurance: 0,
    charisma: 0,
    instinct: 0,
    engineering: 0,
    fortune: 0,
  };
}

export function getTotalAttributePoints(attrs: RacerAttributes): number {
  return attrs.reflexes + attrs.endurance + attrs.charisma + attrs.instinct + attrs.engineering + attrs.fortune;
}

// ── Attribute Definitions ──────────────────────────────────────────────────

const REFLEXES: AttributeDefinition = {
  id: "reflexes",
  name: "Reflexes",
  icon: "\u26A1",
  description: "Improves Driving Rating, helping you handle tighter circuits.",
  ratingType: "driving",
  ratingPerPoint: 3,
};

const ENDURANCE: AttributeDefinition = {
  id: "endurance",
  name: "Endurance",
  icon: "\uD83D\uDEE1",
  description: "Improves Endurance Rating, letting you race longer before fatigue.",
  ratingType: "endurance",
  ratingPerPoint: 3,
};

const CHARISMA: AttributeDefinition = {
  id: "charisma",
  name: "Charisma",
  icon: "\uD83C\uDFA4",
  description: "Grants bonus rep per race and reduces unlock costs.",
  ratingType: "flat",
  ratingPerPoint: 0,
  flatBonuses: [
    { type: "rep_per_race", valuePerPoint: 5 },
    { type: "unlock_cost_reduction", valuePerPoint: 50 },
  ],
};

const INSTINCT: AttributeDefinition = {
  id: "instinct",
  name: "Instinct",
  icon: "\uD83D\uDC41",
  description: "Improves Scavenging Rating for better finds while scavenging.",
  ratingType: "scavenging",
  ratingPerPoint: 3,
};

const ENGINEERING: AttributeDefinition = {
  id: "engineering",
  name: "Engineering",
  icon: "\u2699",
  description: "Improves Mechanics Rating, boosting vehicle maintenance and upgrades.",
  ratingType: "mechanics",
  ratingPerPoint: 3,
};

const FORTUNE: AttributeDefinition = {
  id: "fortune",
  name: "Fortune",
  icon: "\uD83C\uDF40",
  description: "Grants bonus luck and forge token chance.",
  ratingType: "flat",
  ratingPerPoint: 0,
  flatBonuses: [
    { type: "luck", valuePerPoint: 0.2 },
    { type: "forge_token_chance", valuePerPoint: 0.001 },
  ],
};

// ── Export ──────────────────────────────────────────────────────────────────

export const ATTRIBUTE_DEFINITIONS: AttributeDefinition[] = [
  REFLEXES,
  ENDURANCE,
  CHARISMA,
  INSTINCT,
  ENGINEERING,
  FORTUNE,
];

export const ATTRIBUTES_BY_ID = Object.fromEntries(
  ATTRIBUTE_DEFINITIONS.map((a) => [a.id, a]),
) as Record<AttributeName, AttributeDefinition>;

export const ATTRIBUTE_NAMES: AttributeName[] = [
  "reflexes",
  "endurance",
  "charisma",
  "instinct",
  "engineering",
  "fortune",
];
