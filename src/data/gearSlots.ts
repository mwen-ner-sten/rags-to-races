export type GearSlot = "head" | "body" | "hands" | "feet" | "tool" | "accessory";

export const GEAR_SLOTS: GearSlot[] = ["head", "body", "hands", "feet", "tool", "accessory"];

export const GEAR_SLOT_LABELS: Record<GearSlot, { label: string; icon: string }> = {
  head: { label: "Head", icon: "🪖" },
  body: { label: "Body", icon: "👕" },
  hands: { label: "Hands", icon: "🧤" },
  feet: { label: "Feet", icon: "👟" },
  tool: { label: "Tool", icon: "🔧" },
  accessory: { label: "Accessory", icon: "🎒" },
};
