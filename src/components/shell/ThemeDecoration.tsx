import type { ThemeDecoration as DecorationId } from "@/data/themes";

interface Props {
  decoration: DecorationId;
}

/** Fixed, pointer-transparent background layers for a theme (see globals.css). */
const LAYERS: Record<DecorationId, readonly string[]> = {
  grid: ["deco-grid", "deco-scanlines"],
  stripes: ["deco-stripes"],
  paper: ["deco-paper"],
  vapor: ["deco-flat-grid", "deco-horizon"],
  crt: ["deco-rain", "deco-scanlines", "deco-crt"],
  asphalt: ["deco-asphalt", "deco-headlights"],
};

export default function ThemeDecoration({ decoration }: Props) {
  return (
    <div className={`shell-deco shell-deco--${decoration}`} aria-hidden="true">
      {LAYERS[decoration].map((layer) => (
        <div key={layer} className={`deco ${layer}`} />
      ))}
    </div>
  );
}
