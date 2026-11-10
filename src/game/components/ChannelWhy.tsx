"use client";

import { CHANNEL_BY_ID, channelBreakdown, type ChannelId } from "@/core/channels";
import type { GameState } from "@/core/types";

interface ChannelWhyProps {
  game: GameState;
  channelId: ChannelId;
  placeId?: string;
  /** Formats the headline value; defaults to the plain number. */
  format?: (value: number) => string;
}

const trim = (n: number): string => String(Math.round(n * 100) / 100);

/** One source's contribution, written the way the channel counts it. */
export function amountText(kind: "add" | "pct" | "reduce", amount: number): string {
  if (kind === "add") return `${amount > 0 ? "+" : "−"}${trim(Math.abs(amount))}`;
  const percent = trim(Math.abs(amount) * 100);
  if (kind === "reduce") return `${amount > 0 ? "−" : "+"}${percent}%`;
  return `${amount > 0 ? "+" : "−"}${percent}%`;
}

/** The current value of a rate, with a disclosure listing what feeds it (non-zero sources only). */
export function ChannelWhy({ game, channelId, placeId, format }: ChannelWhyProps) {
  const def = CHANNEL_BY_ID[channelId];
  const breakdown = channelBreakdown(game, channelId, { placeId });
  const sources = breakdown.parts.filter((p) => p.amount !== 0);
  const shown = format ? format(breakdown.value) : def.kind === "add" ? trim(breakdown.value) : `×${trim(breakdown.value)}`;
  const base = def.kind === "add" ? trim(def.base) : "100%";
  return (
    <details className="channel-why">
      <summary>
        <span className="num">{shown}</span>
        <span className="channel-why-hint">what feeds this</span>
      </summary>
      <ul>
        <li>
          <span>Base</span>
          <span className="num">{base}</span>
        </li>
        {sources.map((p) => (
          <li key={p.source}>
            <span>{p.label}</span>
            <span className="num">{amountText(def.kind, p.amount)}</span>
          </li>
        ))}
        {sources.length === 0 && <li className="muted">Nothing else yet</li>}
      </ul>
    </details>
  );
}
