import Image from "next/image";
import { getFixedAsset, type FixedAssetKind } from "@/assets/manifest";

interface GameAssetImageProps {
  kind: FixedAssetKind;
  id: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: "eager" | "lazy";
}

export default function GameAssetImage({
  kind,
  id,
  width = 64,
  height = width,
  className,
  loading,
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
      loading={loading}
      className={className}
      style={{
        alignSelf: "center",
        flexShrink: 0,
        objectFit: kind === "location" || kind === "circuit" ? "cover" : "contain",
      }}
    />
  );
}
