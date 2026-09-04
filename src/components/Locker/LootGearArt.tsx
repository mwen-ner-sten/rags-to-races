import Image from "next/image";
import type { GearRarity, GearSlot } from "@/data/lootGear";
import type { EquipmentAffixArt } from "@/assets/equipmentArt";
import { Icon, type IconId } from "@/components/icons/Icon";

const SLOT_GLYPH: Record<GearSlot, IconId> = {
  head: "gear-head",
  body: "gear-body",
  hands: "gear-hands",
  feet: "gear-feet",
  tool: "gear-tool",
  accessory: "gear-accessory",
};

export const RARITY_TOKEN: Record<GearRarity, string> = {
  common: "var(--text-muted)",
  uncommon: "var(--success)",
  rare: "var(--accent)",
  epic: "var(--text-heading)",
  legendary: "var(--warning, var(--accent))",
};

interface LootGearArtProps {
  slot: GearSlot;
  rarity: GearRarity;
  affixes: EquipmentAffixArt[];
  /** Dim the frame and glyph for an empty slot. */
  empty?: boolean;
  size?: number;
  className?: string;
}

/**
 * Composed art for a piece of loot gear: the shared rarity frame and affix
 * overlays from `public/sprites/equipment`, around a slot glyph drawn in code
 * (loot gear has no painted silhouettes yet; see docs/art/asset-brief.md).
 */
export default function LootGearArt({ slot, rarity, affixes, empty = false, size = 64, className }: LootGearArtProps) {
  const layerProps = { width: size, height: size, unoptimized: true } as const;
  const glyphSize = Math.round(size * 0.45);
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className ?? ""}`}
      style={{ width: size, height: size, opacity: empty ? 0.45 : 1 }}
      role="img"
      aria-label={empty ? `Empty ${slot} slot` : `${rarity} ${slot} gear`}
    >
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: empty ? "var(--text-muted)" : RARITY_TOKEN[rarity] }}
      >
        <Icon id={SLOT_GLYPH[slot]} size={glyphSize} />
      </span>
      {!empty && affixes.slice(0, 3).map((affix) => (
        <Image
          key={affix}
          {...layerProps}
          src={`/sprites/equipment/affixes/${affix}.webp`}
          alt=""
          className="absolute inset-0 object-contain"
        />
      ))}
      <Image
        {...layerProps}
        src={`/sprites/equipment/rarity/${rarity}.webp`}
        alt=""
        className="absolute inset-0 object-contain"
      />
    </span>
  );
}
