import type { GameState } from "../types";

/**
 * One-time tips: a short "what this is and how to use it" shown where a system
 * lives, the first time ever it shows up. Dismissed tips are remembered in meta.
 */
export interface TipDef {
  id: string;
  title: string;
  lines: readonly string[];
  /** When the tip is relevant (usually the system's reveal). */
  when: (state: GameState) => boolean;
}

const revealed = (key: string) => (s: GameState) => s.run.revealed.includes(key);

export const TIPS: readonly TipDef[] = [
  {
    id: "garage",
    title: "Your garage",
    lines: [
      "Everything you find lands here. Condition is what matters: a better part gives more of its stats on the track and sells for more.",
      "Bench jobs (Clean, Repair, Restore, Strip) take time and run by themselves. Start one, then go take a trip.",
    ],
    when: revealed("garage"),
  },
  {
    id: "materials",
    title: "Materials",
    lines: ["Metal, rubber and wiring come from stripping parts. Repairs, some builds and Shelving use them up, so strip parts you don't need instead of selling everything."],
    when: revealed("materials"),
  },
  {
    id: "driveway",
    title: "The driveway",
    lines: [
      "Finds that don't fit in the garage wait here, and move in by themselves as soon as there's space. Nothing in the garage gets thrown out to make room.",
      "Want one now? Swap it in for your cheapest part, or strip or sell it. If the driveway fills up too, the rule shown below decides what goes.",
    ],
    when: (s) => s.run.driveway.length > 0,
  },
  {
    id: "build",
    title: "Building",
    lines: ["Each plan has slots. The best part you own for each slot is picked for you; press Assemble. Scrap parts can't go in, so clean them first.", "Better parts can be swapped in later from Your vehicles."],
    when: revealed("build"),
  },
  {
    id: "race",
    title: "Racing",
    lines: [
      "The odds show your chance of winning with this vehicle and call. Your car races on the track while you get on with other things.",
      "A top-3 finish opens the next event at that venue. Winning a Feature opens new places to race.",
      "Racing wears parts down. Check them in the Garage between races.",
    ],
    when: revealed("race"),
  },
  {
    id: "queue",
    title: "The queue",
    lines: ["Line up to 3 jobs. Each starts as soon as your hands or a bench are free.", "Fill it before you step away: the game keeps working while you're gone, for up to 48 hours."],
    when: revealed("queue"),
  },
  {
    id: "places",
    title: "New places",
    lines: ["Spend Rep to open a new place. Better places turn up better parts but take longer to get to. Rep comes from racing."],
    when: revealed("places"),
  },
  {
    id: "tools",
    title: "Tools counter",
    lines: ["Tools make bench work faster or let you learn new know-how. They last until the Season ends."],
    when: revealed("tools"),
  },
  {
    id: "codex",
    title: "Your Notebook",
    lines: ["The Journal keeps your story. Know-how is what you can study. The Codex lists every part and place you've come across."],
    when: revealed("codex"),
  },
  {
    id: "knowhow",
    title: "Know-how",
    lines: [
      "New techniques and plans show up here once they'd be useful. Studying keeps your hands busy for a while, so queue a trip to start after it.",
      "Once learned, it's quicker to learn again in later Seasons.",
    ],
    when: revealed("knowhow"),
  },
  {
    id: "habits",
    title: "Habits",
    lines: ["Do the same job enough times and it becomes a Habit. Put a Habit in a slot and it repeats on its own, a bit slower than doing it by hand."],
    when: revealed("habits"),
  },
  {
    id: "crew",
    title: "Crew",
    lines: ["Crew members work jobs in parallel with you. Give each one an assignment, and keep an eye on morale: tired crew work slower."],
    when: revealed("crew"),
  },
];

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]));
