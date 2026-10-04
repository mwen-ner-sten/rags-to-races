import { channel } from "./channels";
import { PLACE_BY_ID } from "./content/places";
import { STORY, addJournal } from "./journal";
import { resolveFlags } from "./rules";
import type { GameState, JobSpec, JobTemplate } from "./types";

/** Base repetitions before a job becomes a Habit (haul thresholds live on places). */
const BASE_THRESHOLD: Record<string, number> = { clean: 20, repair: 15, strip: 25, race: 30 };

/** Template used for counting repetitions ("haul:curb", "clean", "race"). */
export function baseTemplate(spec: JobSpec): JobTemplate | null {
  switch (spec.kind) {
    case "haul":
      return PLACE_BY_ID[spec.placeId]?.habitAt ? `haul:${spec.placeId}` : null;
    case "clean":
    case "repair":
    case "strip":
      return spec.kind;
    case "race":
      return "race";
    default:
      return null;
  }
}

/** Habit key for a slot assignment; races carry their settings. */
export function templateBase(template: JobTemplate): JobTemplate {
  if (template.startsWith("race")) return "race";
  const parts = template.split(":");
  return parts[0] === "haul" ? `${parts[0]}:${parts[1]}` : parts[0];
}

export function habitThreshold(state: GameState, template: JobTemplate): number {
  const base = template.startsWith("haul:") ? PLACE_BY_ID[template.slice(5)]?.habitAt ?? 25 : BASE_THRESHOLD[template] ?? 25;
  const memory = state.meta.habitMemory[template] ?? 0;
  return Math.max(2, Math.round(base / Math.pow(2, memory)));
}

/** Counts a completed job and turns it into a Habit at its threshold. */
export function countRepetition(state: GameState, spec: JobSpec): void {
  const template = baseTemplate(spec);
  if (!template) return;
  state.run.reps[template] = (state.run.reps[template] ?? 0) + 1;
  if (state.run.habitsKnown.includes(template)) return;
  if (resolveFlags(state).habitsDisabled) return;
  if (state.run.reps[template] >= habitThreshold(state, template)) {
    state.run.habitsKnown.push(template);
    addJournal(state, "first_habit", STORY.first_habit);
  }
}

/** Keeps the habit slot array the size of the automation channel (Era 1 only). */
export function syncHabitSlots(state: GameState): void {
  const flags = resolveFlags(state);
  const size = flags.teamEra || flags.habitsDisabled ? 0 : Math.floor(channel(state, "automation"));
  const slots = state.run.habitSlots.slice(0, size);
  while (slots.length < size) slots.push(null);
  state.run.habitSlots = slots;
}
