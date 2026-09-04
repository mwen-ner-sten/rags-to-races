/**
 * Small currentColor glyphs for resources that have no sprite in the asset
 * manifest. Every path is a single 16x16 SVG so the rail stays crisp at any
 * theme colour; no emoji.
 */
export interface ResourceGlyphProps {
  id: string;
  size?: number;
  className?: string;
}

const COMMON = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function glyphFor(id: string) {
  switch (id) {
    case "scrap_bucks": // coin with a bar
      return (
        <>
          <circle cx="8" cy="8" r="6.25" {...COMMON} />
          <path d="M8 4.5v7M6 6.5h3a1.25 1.25 0 0 1 0 2.5H7a1.25 1.25 0 0 0 0 2.5h3" {...COMMON} />
        </>
      );
    case "rep": // star
      return <path d="M8 1.9l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.7l-3.8 2 .7-4.3-3.1-3 4.3-.6z" {...COMMON} />;
    case "lp": // crown
      return <path d="M2.5 12.5h11M2.5 12.5L2 5l3.5 3L8 3.5 10.5 8 14 5l-.5 7.5" {...COMMON} />;
    case "tp": // pennant flag
      return <path d="M3.5 14V2M3.5 2.5h9l-2.5 3 2.5 3h-9" {...COMMON} />;
    case "op": // key
      return (
        <>
          <circle cx="5.5" cy="10.5" r="3" {...COMMON} />
          <path d="M7.7 8.3L13.5 2.5M11 5l2 2M12.5 3.5l1.5 1.5" {...COMMON} />
        </>
      );
    case "pt": // hex token
      return (
        <>
          <path d="M8 1.75l5.4 3.1v6.3L8 14.25l-5.4-3.1v-6.3z" {...COMMON} />
          <circle cx="8" cy="8" r="2" {...COMMON} />
        </>
      );
    case "forge_tokens": // flame
      return <path d="M8 14.5c-3 0-4.5-2-4.5-4.2 0-2.6 2.2-3.6 2.2-5.8 1.2.7 1.9 1.7 2 3 .9-.6 1.3-1.6 1.3-2.8 2.3 1.5 3.5 3.4 3.5 5.6 0 2.2-1.5 4.2-4.5 4.2z" {...COMMON} />;
    case "parts": // bolt
      return (
        <>
          <path d="M8 1.75l1.4 1.9 2.3-.5.5 2.3 1.9 1.4-1.9 1.4.5 2.3-2.3.5L8 14.25l-1.4-1.9-2.3-.5.5-2.3L2.9 8.2l1.9-1.4-.5-2.3 2.3-.5z" {...COMMON} />
          <circle cx="8" cy="8" r="2" {...COMMON} />
        </>
      );
    default:
      return <circle cx="8" cy="8" r="5.5" {...COMMON} />;
  }
}

export default function ResourceGlyph({ id, size = 16, className }: ResourceGlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      {glyphFor(id)}
    </svg>
  );
}
