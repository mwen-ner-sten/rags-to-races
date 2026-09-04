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

const SHOW_MISSING_ASSET_PLACEHOLDER = process.env.NODE_ENV !== "production";

/** Dev-only stand-in so a missing manifest entry is visible instead of silently blank. */
function MissingAssetPlaceholder({
  kind,
  id,
  width,
  height,
  className,
}: Required<Pick<GameAssetImageProps, "kind" | "id" | "width" | "height">> & Pick<GameAssetImageProps, "className">) {
  return (
    <span
      role="img"
      aria-label={`Missing ${kind.replace("_", " ")} artwork: ${id}`}
      title={`Missing asset ${kind}:${id}`}
      data-missing-asset={`${kind}:${id}`}
      className={className}
      style={{
        alignSelf: "center",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width,
        height,
        border: "1px dashed var(--danger, #c83e0c)",
        borderRadius: 4,
        color: "var(--danger, #c83e0c)",
        fontSize: Math.max(8, Math.min(11, Math.floor(width / 6))),
        lineHeight: 1.1,
        overflow: "hidden",
        padding: 2,
        textAlign: "center",
        wordBreak: "break-all",
      }}
    >
      {id}
    </span>
  );
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
  if (!asset) {
    if (!SHOW_MISSING_ASSET_PLACEHOLDER) return null;
    return <MissingAssetPlaceholder kind={kind} id={id} width={width} height={height} className={className} />;
  }
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
