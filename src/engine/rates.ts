/**
 * Resource rates — the single place the UI learns "how fast is this changing".
 *
 * Every resource the player can see gets an amount, a per-second rate, and an
 * optional cap. Rates are derived from the same tick math the game runs on
 * (see computeTick), never estimated separately in a component.
 *
 * Contract shared between the engine and the resource rail. The engine owns
 * computeResourceRates; the UI only reads the returned array.
 */
import type { GameState } from "@/state/store";
import { CURRENCY_DEFINITIONS } from "@/data/currencies";

export interface ResourceRate {
  /** Matches CurrencyDefinition.id, or a derived resource id such as "parts". */
  id: string;
  label: string;
  /** Prefix shown before the amount, e.g. "$". */
  prefix?: string;
  amount: number;
  /** Net change per second at the current state; negative means draining. */
  perSecond: number;
  /** Hard cap if the resource has one (e.g. loose-part storage). */
  cap?: number;
  /** Human-readable breakdown of what makes up the rate. */
  sources?: { label: string; perSecond: number }[];
  /** Whether the player should see this resource yet. */
  visible: boolean;
  /** CSS color token for the value. */
  color: string;
}

/**
 * Stub: exposes every visible currency with a zero rate. The Phase 1 engine
 * work replaces the body with real per-second derivation from tick math.
 */
export function computeResourceRates(state: GameState): ResourceRate[] {
  return CURRENCY_DEFINITIONS.map((c) => ({
    id: c.id,
    label: c.name,
    prefix: c.prefix,
    amount: c.getValue(state),
    perSecond: 0,
    visible: c.gate ? c.gate(state) : true,
    color: c.color,
  }));
}
