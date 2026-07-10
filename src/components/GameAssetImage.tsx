import Image from "next/image";
import { getFixedAsset, type FixedAssetKind } from "@/assets/manifest";

interface GameAssetImageProps {
  kind: FixedAssetKind;
  id: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function GameAssetImage({
  kind,
  id,
  width = 64,
  height = width,
  className,
}: GameAssetImageProps) {
  const asset = getFixedAsset(kind, id);
  if (!asset) return null;
  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={width}
      height={height}
      unoptimized
      className={className}
      style={{ objectFit: kind === "location" || kind === "circuit" ? "cover" : "contain" }}
    />
  );
}
