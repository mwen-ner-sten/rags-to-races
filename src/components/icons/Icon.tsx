/**
 * Interface icon set. Drawn on a 20px grid with a 1.5px round stroke in
 * currentColor so every glyph tints with the theme. Object sprites (parts,
 * vehicles, resources with art) stay painterly; these are the instrument-panel
 * glyphs around them. No emoji anywhere in the shell.
 *
 * See docs/art/asset-brief.md, "UI icons are not sprites".
 */
import type { SVGProps } from "react";

export type IconId =
  | "junkyard"
  | "garage"
  | "race"
  | "workshop"
  | "upgrades"
  | "crew"
  | "help"
  | "log"
  | "settings"
  | "dev"
  | "more"
  | "rate-up"
  | "rate-down"
  | "rate-flat"
  | "cap"
  | "locked"
  | "unlocked"
  | "warning"
  | "danger"
  | "success"
  | "info"
  | "close"
  | "chevron"
  | "external"
  | "search"
  | "clock";

const PATHS: Record<IconId, string> = {
  // A bin with a lid, slightly open: the junkyard.
  junkyard: "M4.5 6.5h11M8 6.5V4.75A.75.75 0 0 1 8.75 4h2.5a.75.75 0 0 1 .75.75V6.5M6 6.5l.7 9.25a1 1 0 0 0 1 .75h4.6a1 1 0 0 0 1-.75L14 6.5M8.5 9.5v4M11.5 9.5v4",
  // Open-end wrench.
  garage: "M13.2 3.2a3.3 3.3 0 0 0-3.9 4.3L3.5 13.3a1.4 1.4 0 0 0 2 2l5.8-5.8a3.3 3.3 0 0 0 4.3-3.9l-2.1 2.1-1.9-.5-.5-1.9z",
  // Chequered flag on a pole.
  race: "M5 17V3.5M5 4h9.5l-1.8 2.75 1.8 2.75H5M5 4v5.5M8 4v5.5M11 4v5.5M5 6.75h9",
  // Toolbox.
  workshop: "M3.5 8.5h13v6.75a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM7.5 8.5V6.25A1.25 1.25 0 0 1 8.75 5h2.5a1.25 1.25 0 0 1 1.25 1.25V8.5M3.5 11.5h13",
  // Arrow rising out of a base line.
  upgrades: "M10 15.5v-10M6 9.5l4-4 4 4M4.5 17h11",
  // Two people.
  crew: "M7.5 9.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 16.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M13 9a2 2 0 1 0 0-4M14.5 12.5c1.7.4 2.5 1.7 2.5 3.5",
  help: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7.75 8.25A2.25 2.25 0 1 1 10 10.5v1.25M10 14.25h.01",
  // A ledger page.
  log: "M5.5 3.5h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM7.5 7h5M7.5 10h5M7.5 13h3",
  // Gear.
  settings: "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 3v1.75M10 15.25V17M3 10h1.75M15.25 10H17M5.05 5.05l1.24 1.24M13.71 13.71l1.24 1.24M5.05 14.95l1.24-1.24M13.71 6.29l1.24-1.24",
  // Code brackets.
  dev: "M7 6.5L3.5 10 7 13.5M13 6.5l3.5 3.5-3.5 3.5M11.25 4.5l-2.5 11",
  more: "M5 10h.01M10 10h.01M15 10h.01",
  "rate-up": "M4.5 13.5l4-4 3 3 4-5M12.5 7.5h3v3",
  "rate-down": "M4.5 6.5l4 4 3-3 4 5M12.5 12.5h3v-3",
  "rate-flat": "M4 10h12",
  // A level line with a stop bar: at capacity.
  cap: "M4 13.5h12M4 6.5h12M10 6.5v7",
  locked: "M6 9V7a4 4 0 1 1 8 0v2M5.5 9h9a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM10 12.25v1.5",
  unlocked: "M6 9V7a4 4 0 0 1 7.6-1.75M5.5 9h9a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM10 12.25v1.5",
  warning: "M10 3.5l7 12.25H3zM10 8.5v3.25M10 14.25h.01",
  danger: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7.5 7.5l5 5M12.5 7.5l-5 5",
  success: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM6.75 10.25l2.25 2.25 4.25-4.5",
  info: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 9.25v4.25M10 6.5h.01",
  close: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  chevron: "M7 4.5l5.5 5.5L7 15.5",
  external: "M11.5 4h4.5v4.5M16 4l-7 7M14 11.5v3.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.5",
  search: "M9 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12.6 12.6L16.5 16.5",
  clock: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6.5V10l2.5 1.5",
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "id"> {
  id: IconId;
  /** Rendered size in px; the grid is 20. */
  size?: number;
  /** Accessible name; omit for purely decorative icons beside a label. */
  title?: string;
}

export function Icon({ id, size = 20, title, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[id]} />
    </svg>
  );
}

export const ICON_IDS = Object.keys(PATHS) as IconId[];
