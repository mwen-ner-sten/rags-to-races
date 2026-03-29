import type { RaceOutcome } from "./race";
import type { CircuitDefinition } from "@/data/circuits";

export interface RaceEvent {
  timeOffset: number;    // ms from race start
  position: number;      // player's current position (1-8)
  commentary: string;    // dramatic text
  type: "start" | "position_change" | "close_call" | "mechanical" | "final_lap" | "finish";
}

const WIN_COMMENTARY = {
  start: [
    "Lights out! You're off the line!",
    "The flag drops! Engines scream!",
    "And we're racing! The pack charges forward!",
  ],
  gaining: [
    "You're gaining on P{target}!",
    "Closing the gap — P{target} is within reach!",
    "Pushing hard, you pull alongside P{target}!",
  ],
  overtake: [
    "OVERTAKE! You slide past into P{pos}!",
    "Clean pass! You're P{pos} now!",
    "Brilliant move — up to P{pos}!",
  ],
  finalLap: [
    "Final lap — it's now or never!",
    "Last lap! The crowd is on their feet!",
    "Bell lap! You can taste the finish!",
  ],
  finish: [
    "CHECKERED FLAG! You take the win!",
    "P1! From scrap heap to victory lane!",
    "First across the line! What a race!",
  ],
};

const LOSS_COMMENTARY = {
  start: [
    "And they're off! You settle into the pack.",
    "Green flag! The field surges forward!",
    "Race is on! Jockeying for position early.",
  ],
  mid: [
    "Holding P{pos}... the car ahead pulls away.",
    "Battling hard in P{pos}. Not enough pace today.",
    "You're stuck in P{pos}, looking for a gap.",
    "P{pos} — the leaders are pulling away.",
  ],
  finalLap: [
    "Final lap — not enough left in the tank.",
    "Last lap. You push but the gap is too big.",
  ],
  finish: [
    "You cross the line in P{pos}. Solid finish.",
    "P{pos} at the flag. There's always next time.",
    "Not the result you wanted, but you finished.",
  ],
};

const DNF_COMMENTARY = {
  start: [
    "And they're off! Your engine sounds... interesting.",
    "Green flag! The scrap heap lurches forward!",
    "Race started! Something's rattling under the hood.",
  ],
  warning: [
    "That doesn't sound good...",
    "Smoke from the engine bay!",
    "Temperature gauge is in the red!",
    "Something just fell off the car...",
  ],
  breakdown: [
    "BANG! The engine lets go! You're out!",
    "Mechanical failure! The car grinds to a halt!",
    "That's it — she's done. DNF.",
    "A wheel parts company with the axle. Race over.",
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(text: string, vars: Record<string, number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? "?"));
}

/**
 * Generate a sequence of timed events for a race, working backward
 * from the known outcome to create a dramatic narrative.
 */
export function generateRaceEvents(
  outcome: RaceOutcome,
  circuit: CircuitDefinition,
  durationMs: number,
): RaceEvent[] {
  const events: RaceEvent[] = [];
  const totalRacers = outcome.totalRacers;

  if (outcome.result === "win") {
    // Start mid-pack, overtake progressively to P1
    const startPos = Math.min(totalRacers - 1, Math.floor(Math.random() * 3) + 4); // P4-P6
    const steps = startPos - 1; // positions to gain
    const segmentTime = durationMs / (steps + 3); // +3 for start, final lap, finish

    events.push({ timeOffset: 0, position: startPos, commentary: pick(WIN_COMMENTARY.start), type: "start" });

    let currentPos = startPos;
    for (let i = 0; i < steps; i++) {
      const t = segmentTime * (i + 1);
      const targetPos = currentPos;
      currentPos--;

      // Alternate gaining/overtake commentary
      if (i % 2 === 0 && i < steps - 1) {
        events.push({ timeOffset: t - segmentTime * 0.3, position: currentPos + 1, commentary: fillTemplate(pick(WIN_COMMENTARY.gaining), { target: targetPos }), type: "close_call" });
      }
      events.push({ timeOffset: t, position: currentPos, commentary: fillTemplate(pick(WIN_COMMENTARY.overtake), { pos: currentPos }), type: "position_change" });
    }

    events.push({ timeOffset: durationMs - segmentTime * 1.2, position: 1, commentary: pick(WIN_COMMENTARY.finalLap), type: "final_lap" });
    events.push({ timeOffset: durationMs - 200, position: 1, commentary: pick(WIN_COMMENTARY.finish), type: "finish" });

  } else if (outcome.result === "loss") {
    const finalPos = outcome.position;
    // Start a bit behind final, fluctuate
    const startPos = Math.min(totalRacers, Math.max(finalPos + 1, finalPos + Math.floor(Math.random() * 2) + 1));
    const segments = 4;
    const segmentTime = durationMs / (segments + 1);

    events.push({ timeOffset: 0, position: startPos, commentary: pick(LOSS_COMMENTARY.start), type: "start" });

    // Gradually move toward final position with some fluctuation
    let currentPos = startPos;
    for (let i = 1; i <= segments - 1; i++) {
      const progress = i / segments;
      const targetPos = Math.round(startPos + (finalPos - startPos) * progress);
      if (targetPos !== currentPos) {
        currentPos = targetPos;
        events.push({ timeOffset: segmentTime * i, position: currentPos, commentary: fillTemplate(pick(LOSS_COMMENTARY.mid), { pos: currentPos }), type: "position_change" });
      } else {
        events.push({ timeOffset: segmentTime * i, position: currentPos, commentary: fillTemplate(pick(LOSS_COMMENTARY.mid), { pos: currentPos }), type: "close_call" });
      }
    }

    events.push({ timeOffset: durationMs - segmentTime * 1.2, position: finalPos, commentary: pick(LOSS_COMMENTARY.finalLap), type: "final_lap" });
    events.push({ timeOffset: durationMs - 200, position: finalPos, commentary: fillTemplate(pick(LOSS_COMMENTARY.finish), { pos: finalPos }), type: "finish" });

  } else {
    // DNF: normal start, warning, then breakdown
    const startPos = Math.floor(Math.random() * 3) + 4;
    const breakdownTime = durationMs * (0.4 + Math.random() * 0.3); // 40-70% through

    events.push({ timeOffset: 0, position: startPos, commentary: pick(DNF_COMMENTARY.start), type: "start" });
    events.push({ timeOffset: breakdownTime * 0.6, position: startPos - 1, commentary: pick(DNF_COMMENTARY.warning), type: "mechanical" });
    events.push({ timeOffset: breakdownTime, position: totalRacers, commentary: pick(DNF_COMMENTARY.breakdown), type: "finish" });
  }

  return events.sort((a, b) => a.timeOffset - b.timeOffset);
}
