/**
 * Event ladder: every venue hosts Sprint, Heat and Feature. This module is the
 * one place that turns a venue plus an event id into the numbers a race uses,
 * and that decides which events a player has opened.
 */
import {
  entryFeeForPrize,
  EVENT_LADDER,
  type CircuitDefinition,
  type EventDefinition,
  type EventId,
} from "@/data/circuits";
import type { RaceOutcome } from "./race";

/** Wins per event at one venue. */
export type EventWinMap = Partial<Record<EventId, number>>;
/** Wins per event, keyed by venue (circuit) id. */
export type EventWins = Record<string, EventWinMap>;

/** A venue resolved to one of its events: the values every race system consumes. */
export interface EventCircuit extends CircuitDefinition {
  venueId: string;
  eventId: EventId;
  eventName: string;
  event: EventDefinition;
}

export function getEventDefinition(eventId: EventId): EventDefinition {
  const definition = EVENT_LADDER.find((event) => event.id === eventId);
  if (!definition) throw new Error(`Unknown event ${eventId}`);
  return definition;
}

export function isEventCircuit(circuit: CircuitDefinition): circuit is EventCircuit {
  return typeof (circuit as EventCircuit).eventId === "string";
}

/** Multiply the venue's Heat values by the event's ladder multipliers. */
export function resolveEventCircuit(circuit: CircuitDefinition, eventId: EventId): EventCircuit {
  if (isEventCircuit(circuit) && circuit.eventId === eventId) return circuit;
  const event = (circuit.events ?? EVENT_LADDER).find((candidate) => candidate.id === eventId) ?? getEventDefinition(eventId);
  const rewardBase = Math.round(circuit.rewardBase * event.prizeMult);
  return {
    ...circuit,
    venueId: circuit.id,
    eventId: event.id,
    eventName: event.name,
    event,
    difficulty: Math.round(circuit.difficulty * event.difficultyMult),
    rewardBase,
    repReward: Math.round(circuit.repReward * event.repMult * 10) / 10,
    // The tutorial venue stays free; everywhere else the fee is 15% of the prize.
    entryFee: circuit.entryFee > 0 ? entryFeeForPrize(rewardBase) : 0,
  };
}

export function getEventWinCount(wins: EventWins | undefined, circuitId: string, eventId: EventId): number {
  return wins?.[circuitId]?.[eventId] ?? 0;
}

/** Sprint is always open; each later event needs a win in the one before it at this venue. */
export function isEventOpen(eventId: EventId, venueWins: EventWinMap | undefined): boolean {
  const event = getEventDefinition(eventId);
  if (event.opensAfter === null) return true;
  return (venueWins?.[event.opensAfter] ?? 0) > 0;
}

export function getOpenEventIds(venueWins: EventWinMap | undefined): EventId[] {
  return EVENT_LADDER.filter((event) => isEventOpen(event.id, venueWins)).map((event) => event.id);
}

/** The first event on this venue's ladder that is still closed, if any. */
export function nextEventToOpen(venueWins: EventWinMap | undefined): EventId | null {
  return EVENT_LADDER.find((event) => !isEventOpen(event.id, venueWins))?.id ?? null;
}

export function addEventWin(wins: EventWins | undefined, circuitId: string, eventId: EventId, count = 1): EventWins {
  const venue = wins?.[circuitId] ?? {};
  return { ...(wins ?? {}), [circuitId]: { ...venue, [eventId]: (venue[eventId] ?? 0) + count } };
}

export function mergeEventWins(base: EventWins | undefined, delta: EventWins | undefined): EventWins {
  let merged: EventWins = { ...(base ?? {}) };
  for (const [circuitId, venue] of Object.entries(delta ?? {})) {
    for (const [eventId, count] of Object.entries(venue) as [EventId, number][]) {
      if (count > 0) merged = addEventWin(merged, circuitId, eventId, count);
    }
  }
  return merged;
}

/** Event wins carried by a batch of outcomes (older saves' outcomes without an event count as Heats). */
export function eventWinsFromOutcomes(outcomes: readonly Pick<RaceOutcome, "result" | "circuitId" | "eventId">[]): EventWins {
  let wins: EventWins = {};
  for (const outcome of outcomes) {
    if (outcome.result !== "win") continue;
    wins = addEventWin(wins, outcome.circuitId, outcome.eventId ?? "heat");
  }
  return wins;
}

/** Events at this venue that opened because of `delta`, in ladder order. */
export function newlyOpenedEventIds(before: EventWinMap | undefined, after: EventWinMap | undefined): EventId[] {
  return EVENT_LADDER
    .filter((event) => !isEventOpen(event.id, before) && isEventOpen(event.id, after))
    .map((event) => event.id);
}
