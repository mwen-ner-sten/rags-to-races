import type { GameState, JobSpec, RaceCall } from "./types";

export type CourseSurface = "fast lane" | "switchbacks" | "loose gravel" | "broken road";

interface ClubCourse {
  name: string;
  brief: string;
  power: number;
  handling: number;
  reliability: number;
  traction: number;
  wear: number;
  failure: number;
  surcharge: number;
  stages: readonly CourseSurface[];
  proofCall: RaceCall;
  podiums: number;
  loanPart: string;
}

export const CLUB_COURSES = {
  tight_infield: {
    name: "Tight Infield",
    brief: "Short approaches favor grip and handling. In Drag, a short launch zone puts the premium on traction. Rally runs switchbacks and gravel.",
    power: 0.78, handling: 1.42, reliability: 1, traction: 1.42,
    wear: 0.90, failure: 0.90, surcharge: 0,
    stages: ["switchbacks", "loose gravel", "switchbacks", "broken road"],
    proofCall: "nurse", podiums: 2, loanPart: "wheel_knobby",
  },
  fast_straight: {
    name: "Fast Straight",
    brief: "Long straights favor horsepower at a cost in wear and breakdown risk. Rally keeps more of the card on fast lanes.",
    power: 1.28, handling: 0.75, reliability: 0.97, traction: 0.87,
    wear: 1.22, failure: 1.20, surcharge: 3,
    stages: ["fast lane", "fast lane", "loose gravel", "fast lane"],
    proofCall: "push", podiums: 2, loanPart: "engine_tiller",
  },
} as const satisfies Record<string, ClubCourse>;

export type ClubCourseId = keyof typeof CLUB_COURSES;

export function clubLoanOrigin(course: ClubCourseId): string {
  return `${CLUB_COURSES[course].name} Workshop Loan`;
}

export function clubRaceCourse(state: GameState, spec: Extract<JobSpec, { kind: "race" }>): ClubCourseId | undefined {
  if (spec.clubRound && !spec.tourRound) return state.config.clubCourse;
}
