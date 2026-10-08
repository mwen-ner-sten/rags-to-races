import { jobBlocker, nextEventInMs } from "@/core/jobs";
import { raceDurationMs } from "@/core/race";
import type { EventKind, GameState, JobSpec } from "@/core/types";
import { capitalize, duration } from "../../format";
import { jobLabel } from "../../labels";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

const PREVIOUS: Record<EventKind, EventKind | null> = { sprint: null, heat: "sprint", feature: "heat" };

export type EventStatus =
  | { kind: "locked"; text: string }
  | { kind: "running"; text: string }
  | { kind: "signed_up"; text: string; queueIndex: number }
  | { kind: "blocked"; text: string }
  | { kind: "ready"; action: "Enter" | "Sign up"; detail: string };

const isEvent = (spec: JobSpec, venueId: string, event: EventKind) => spec.kind === "race" && spec.venueId === venueId && spec.event === event;

/** What your hands are doing, as "after your trip (2m)", or null when they're free. */
function handsLater(game: GameState): string | null {
  const hands = game.run.jobs.find((j) => j.lane === "hands");
  if (hands) return `after ${jobLabel(game, hands.spec).toLowerCase()} (${duration(hands.remaining)})`;
  const queued = game.run.queue.some((q) => q.kind === "haul" || q.kind === "study" || q.kind === "assemble" || q.kind === "race");
  return queued ? "after your queued jobs" : null;
}

/** Where an event stands for this vehicle, and what pressing its button would do. */
export function eventStatus(game: GameState, spec: RaceSpec): EventStatus {
  const { venueId, event } = spec;
  if (!(game.run.ladder[venueId] ?? []).includes(event)) {
    const prev = PREVIOUS[event];
    return { kind: "locked", text: prev ? `Finish top 3 in the ${capitalize(prev)} to open this` : "Not open yet" };
  }
  if (game.run.jobs.some((j) => isEvent(j.spec, venueId, event))) return { kind: "running", text: "On the track now" };
  const queueIndex = game.run.queue.findIndex((q) => isEvent(q, venueId, event));
  const wait = nextEventInMs(game, venueId, event);
  if (queueIndex >= 0) {
    const later = handsLater(game);
    const text = wait > 0 ? `Signed up · starts in ${duration(wait)}` : later ? `Signed up · starts ${later}` : "Signed up · starting";
    return { kind: "signed_up", text, queueIndex };
  }
  if (game.run.queue.some((q) => q.kind === "race" && q.vehicleUid === spec.vehicleUid)) return { kind: "blocked", text: "This vehicle is signed up for another race" };
  const blocker = jobBlocker(game, spec, true);
  if (blocker) return { kind: "blocked", text: blocker };
  if (wait > 0) return { kind: "ready", action: "Sign up", detail: `next run in ${duration(wait)}` };
  const later = handsLater(game);
  return { kind: "ready", action: "Enter", detail: later ? `starts ${later}` : `starts now · ${duration(raceDurationMs(game, spec))} race` };
}
