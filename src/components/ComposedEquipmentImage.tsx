import Image from "next/image";
import { composeEquipmentArt, type EquipmentArtVariant } from "@/assets/equipmentArt";

interface ComposedEquipmentImageProps {
  variant: EquipmentArtVariant;
  size?: number;
  className?: string;
}

export default function ComposedEquipmentImage({
  variant,
  size = 64,
  className,
}: ComposedEquipmentImageProps) {
  const art = composeEquipmentArt(variant);
  const layerProps = { width: size, height: size, unoptimized: true } as const;

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${variant.rarity} ${variant.slot} station equipment`}
    >
      <Image {...layerProps} src={art.silhouette} alt="" className="absolute inset-0 object-contain" />
      {art.setMotif && (
        <Image {...layerProps} src={art.setMotif} alt="" className="absolute inset-0 object-contain" />
      )}
      {art.affixOverlays.slice(0, 3).map((src) => (
        <Image key={src} {...layerProps} src={src} alt="" className="absolute inset-0 object-contain" />
      ))}
      <Image {...layerProps} src={art.rarityFrame} alt="" className="absolute inset-0 object-contain" />
    </span>
  );
}
