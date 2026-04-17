/**
 * Currency definitions — the single source of truth for every in-game currency.
 * To add a new currency:
 *   1. Add a definition to CURRENCY_DEFINITIONS
 *   2. Nothing else — the <CurrencyBar> picks it up automatically
 *
 * Each currency controls:
 *   - Which tabs it shows on (relevantTabs or showOnAllTabs)
 *   - A gate for progression-locked currencies (e.g. LP hidden until earned)
 *   - Its own tooltip content (rows function)
 */
import type { GameState } from "@/state/store";

export type TabId =
  | "junkyard" | "garage" | "race" | "gear" | "talents" | "upgrades"
  | "help" | "log" | "settings" | "dev";

export interface CurrencyTooltipRow {
  label: string;
  value: string;
  /** Dim styling for secondary rows. */
  dim?: boolean;
  /** Optional accent color override. */
  color?: string;
}

export interface CurrencyTooltipSection {
  label: string;
  rows: CurrencyTooltipRow[];
}

export interface CurrencyDefinition {
  id: string;
  /** Short caps label shown in the HUD (e.g. "SCRAP BUCKS"). */
  shortLabel: string;
  /** Full name used in tooltip headings. */
  name: string;
  /** Prefix for the value (e.g. "$"). */
  prefix?: string;
  /** Which tabs this currency should appear on. Ignored if showOnAllTabs is true. */
  relevantTabs?: TabId[];
  /** If true, the currency is always visible regardless of active tab. */
  showOnAllTabs?: boolean;
  /** Optional gate — hidden in the HUD if this returns false. */
  gate?: (state: GameState) => boolean;
  /** Current value from state. */
  getValue: (state: GameState) => number;
  /** Formatted display string (e.g. "$1.2K" or "1,234"). Prefix is added separately. */
  formatValue: (n: number) => string;
  /** CSS variable or hex for the value color. */
  color: string;
  /** Tooltip section contents. Pure function of state. */
  getTooltip: (state: GameState) => CurrencyTooltipSection[];
  /** One-line description of what the currency is used for. Shown at top of tooltip. */
  description: string;
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function compact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toString();
}

function rep(n: number): string {
  if (n >= 10) return compact(n);
  if (n === 0) return "0";
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

function withCommas(n: number): string {
  return Math.floor(n).toLocaleString();
}

// ── Definitions ──────────────────────────────────────────────────────────────

const SCRAP_BUCKS: CurrencyDefinition = {
  id: "scrap_bucks",
  shortLabel: "SCRAP BUCKS",
  name: "Scrap Bucks",
  prefix: "$",
  showOnAllTabs: true,
  color: "var(--accent, #c83e0c)",
  getValue: (s) => s.scrapBucks,
  formatValue: compact,
  description: "Primary currency. Earn from races and selling parts. Spend on building, repairs, upgrades.",
  getTooltip: (s) => [
    {
      label: "Scrap Bucks",
      rows: [
        { label: "Current", value: `$${withCommas(s.scrapBucks)}`, color: "var(--success, #6aaa3a)" },
        { label: "Lifetime earned", value: `$${withCommas(s.lifetimeScrapBucks)}`, dim: true },
        { label: "All-time earned", value: `$${withCommas(s.lifetimeScrapBucksAllTime)}`, dim: true },
      ],
    },
    ...(s.prestigeBonus && s.prestigeCount > 0
      ? [{
          label: "Multipliers",
          rows: [
            { label: "Prestige", value: `${s.prestigeBonus.scrapMultiplier.toFixed(2)}x` },
          ],
        }]
      : []),
  ],
};

const REP: CurrencyDefinition = {
  id: "rep",
  shortLabel: "REP",
  name: "Rep Points",
  showOnAllTabs: true,
  color: "var(--accent-secondary, #ff0090)",
  getValue: (s) => s.repPoints,
  formatValue: rep,
  description: "Reputation from races. Unlocks locations, circuits, vehicles, and late-game systems.",
  getTooltip: (s) => [
    {
      label: "Rep",
      rows: [
        { label: "Current", value: rep(s.repPoints), color: "var(--info, #6aaa3a)" },
      ],
    },
    ...(s.prestigeBonus && s.prestigeCount > 0
      ? [{
          label: "Multipliers",
          rows: [
            { label: "Prestige", value: `${s.prestigeBonus.repMultiplier.toFixed(2)}x` },
          ],
        }]
      : []),
  ],
};

const LEGACY_POINTS: CurrencyDefinition = {
  id: "lp",
  shortLabel: "LP",
  name: "Legacy Points",
  relevantTabs: ["upgrades"],
  gate: (s) => s.legacyPoints > 0 || s.lifetimeLegacyPoints > 0,
  color: "#a78bfa",
  getValue: (s) => s.legacyPoints,
  formatValue: compact,
  description: "Earned on Scrap Reset. Spend in the Legacy shop for permanent bonuses.",
  getTooltip: (s) => [
    {
      label: "Legacy Points",
      rows: [
        { label: "Current", value: withCommas(s.legacyPoints), color: "#a78bfa" },
        { label: "Lifetime earned", value: withCommas(s.lifetimeLegacyPoints), dim: true },
        { label: "All-time earned", value: withCommas(s.lifetimeLPAllTime), dim: true },
      ],
    },
    {
      label: "Prestige",
      rows: [
        { label: "Scrap resets", value: withCommas(s.lifetimeScrapResets) },
        { label: "Current prestige", value: String(s.prestigeCount) },
      ],
    },
  ],
};

const TEAM_POINTS: CurrencyDefinition = {
  id: "tp",
  shortLabel: "TP",
  name: "Team Points",
  relevantTabs: ["upgrades"],
  gate: (s) => s.teamEraCount > 0 || s.teamPoints > 0,
  color: "#22d3ee",
  getValue: (s) => s.teamPoints,
  formatValue: compact,
  description: "Earned on Team Reset. Spend on Team upgrades for cross-prestige bonuses.",
  getTooltip: (s) => [
    {
      label: "Team Points",
      rows: [
        { label: "Current", value: withCommas(s.teamPoints), color: "#22d3ee" },
        { label: "Lifetime earned", value: withCommas(s.lifetimeTeamPoints), dim: true },
      ],
    },
    {
      label: "Team Era",
      rows: [
        { label: "Era", value: String(s.teamEraCount) },
        { label: "LP this era", value: withCommas(s.lifetimeLPThisTeamEra), dim: true },
      ],
    },
  ],
};

const OWNER_POINTS: CurrencyDefinition = {
  id: "op",
  shortLabel: "OP",
  name: "Owner Points",
  relevantTabs: ["upgrades"],
  gate: (s) => s.ownerEraCount > 0 || s.ownerPoints > 0,
  color: "#f472b6",
  getValue: (s) => s.ownerPoints,
  formatValue: compact,
  description: "Earned on Owner Reset. Spend on Owner upgrades for team-wide bonuses.",
  getTooltip: (s) => [
    {
      label: "Owner Points",
      rows: [
        { label: "Current", value: withCommas(s.ownerPoints), color: "#f472b6" },
        { label: "Lifetime earned", value: withCommas(s.lifetimeOwnerPoints), dim: true },
      ],
    },
    {
      label: "Owner Era",
      rows: [
        { label: "Era", value: String(s.ownerEraCount) },
        { label: "TP this era", value: withCommas(s.lifetimeTPThisOwnerEra), dim: true },
      ],
    },
  ],
};

const TRACK_TOKENS: CurrencyDefinition = {
  id: "pt",
  shortLabel: "PT",
  name: "Prestige Tokens",
  relevantTabs: ["upgrades"],
  gate: (s) => s.trackEraCount > 0 || s.trackPrestigeTokens > 0,
  color: "#fbbf24",
  getValue: (s) => s.trackPrestigeTokens,
  formatValue: compact,
  description: "Earned on Track Reset. Spend on track perks for endgame bonuses.",
  getTooltip: (s) => [
    {
      label: "Prestige Tokens",
      rows: [
        { label: "Current", value: withCommas(s.trackPrestigeTokens), color: "#fbbf24" },
        { label: "Lifetime earned", value: withCommas(s.lifetimeTrackTokens), dim: true },
      ],
    },
    {
      label: "Track Era",
      rows: [
        { label: "Era", value: String(s.trackEraCount) },
        { label: "OP this era", value: withCommas(s.lifetimeOPThisTrackEra), dim: true },
      ],
    },
  ],
};

const FORGE_TOKENS: CurrencyDefinition = {
  id: "forge_tokens",
  shortLabel: "FORGE",
  name: "Forge Tokens",
  relevantTabs: ["gear", "upgrades"],
  gate: (s) => s.forgeTokens > 0 || s.totalForgeTokensEarned > 0,
  color: "var(--accent-secondary, #c4872a)",
  getValue: (s) => s.forgeTokens,
  formatValue: compact,
  description: "Rare drops from high-tier races. Spend in the Forge to enhance gear.",
  getTooltip: (s) => [
    {
      label: "Forge Tokens",
      rows: [
        { label: "Current", value: withCommas(s.forgeTokens), color: "var(--accent-secondary, #c4872a)" },
        { label: "All-time earned", value: withCommas(s.totalForgeTokensEarned), dim: true },
      ],
    },
  ],
};

// ── Registry ─────────────────────────────────────────────────────────────────

export const CURRENCY_DEFINITIONS: CurrencyDefinition[] = [
  SCRAP_BUCKS,
  REP,
  LEGACY_POINTS,
  TEAM_POINTS,
  OWNER_POINTS,
  TRACK_TOKENS,
  FORGE_TOKENS,
];

/** Get the currencies that should be visible in the HUD for the given tab + state. */
export function getVisibleCurrencies(activeTab: TabId, state: GameState): CurrencyDefinition[] {
  return CURRENCY_DEFINITIONS.filter((c) => {
    // Tab filter
    const tabAllows = c.showOnAllTabs || (c.relevantTabs?.includes(activeTab) ?? false);
    if (!tabAllows) return false;
    // Gate
    if (c.gate && !c.gate(state)) return false;
    return true;
  });
}
