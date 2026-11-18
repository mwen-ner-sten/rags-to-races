import { getVenue } from "./content/events";
import { VEHICLE_BY_ID } from "./content/vehicles";
import { vehicleBusy } from "./garage";
import { dnfChance, raceDurationMs, rollRace, winChance, type RaceGridEntry } from "./race";
import { initialConfig, initialMeta, initialRun, initialTeam } from "./state";
import type { Condition, EventKind, GameState, RaceCall, TuneSetting, Vehicle } from "./types";

const MINUTE = 60_000;
const FINISH_POINTS = [8, 5, 3, 2, 1, 1];
const ARCHIVE_LIMIT = 12;
export const CLOSE_FINISH_GAP = 0.08;

type Round = { venueId: string; event: EventKind };

interface Charter {
  name: string;
  brief: string;
  vehicleId: string;
  rounds: readonly Round[];
  passes: number;
  minimumFinishes: number;
  minimumPoints: number;
  minimumPodiums: number;
  priorCharters: number;
}

export const PROMOTER_CHARTERS = {
  homecoming: {
    name: "Homecoming Cup",
    brief: "Bring riding mowers back to the Backyard. Keep the old machines together when the calendar moves onto rough dirt.",
    vehicleId: "riding_mower",
    rounds: [{ venueId: "backyard", event: "heat" }, { venueId: "dirt", event: "sprint" }, { venueId: "backyard", event: "feature" }],
    passes: 3, minimumFinishes: 2, minimumPoints: 8, minimumPodiums: 1, priorCharters: 0,
  },
  ironworks: {
    name: "Ironworks Trophy",
    brief: "The same kart tackles the rough Dirt Track and the County Fair straights. One workshop pass has to cover the whole calendar.",
    vehicleId: "go_kart",
    rounds: [{ venueId: "dirt", event: "heat" }, { venueId: "county_fair", event: "sprint" }, { venueId: "dirt", event: "feature" }],
    passes: 1, minimumFinishes: 3, minimumPoints: 9, minimumPodiums: 1, priorCharters: 0,
  },
  midnight: {
    name: "Midnight Stock Tour",
    brief: "Take a Street Stock through technical Regional rounds and the fast State finale. The visiting works teams are watching.",
    vehicleId: "street_stock",
    rounds: [{ venueId: "regional", event: "heat" }, { venueId: "regional", event: "feature" }, { venueId: "state", event: "feature" }],
    passes: 2, minimumFinishes: 2, minimumPoints: 8, minimumPodiums: 1, priorCharters: 1,
  },
} as const satisfies Record<string, Charter>;

export type PromoterCharter = keyof typeof PROMOTER_CHARTERS;

export const STEWARDSHIP = {
  paddock: { name: "Open Paddock", brief: "Loan the visitors tools and reduce breakdowns. At least 14 of 18 starts must reach the flag.", finishes: 14, closeFinishes: 0 },
  pro: { name: "Close Grid", brief: "Invite a quicker, closely matched field. At least two winning gaps must be within eight percent. If your guest is running away from the field, try Nurse or enter a less powerful build.", finishes: 10, closeFinishes: 2 },
} as const;

export type Stewardship = keyof typeof STEWARDSHIP;

export const PROMOTER_VISITORS = {
  dale: { name: "Dale", preferred: "backyard", pace: 0.99, out: 0.18 },
  marisol: { name: "Marisol", preferred: "dirt", pace: 1.02, out: 0.07 },
  big_ron: { name: "Big Ron", preferred: "county_fair", pace: 1.05, out: 0.11 },
  jo: { name: "Jo", preferred: "regional", pace: 0.97, out: 0.12 },
  silva: { name: "Silva", preferred: "state", pace: 1.00, out: 0.06 },
} as const;

export type PromoterVisitor = keyof typeof PROMOTER_VISITORS;

export interface PromoterBooking {
  due: number;
  result: PromoterRoundResult;
}

export interface PromoterRoundResult {
  call: RaceCall;
  position: number;
  fieldSize: number;
  dnf: boolean;
  weakestSlot: string | null;
  wear: { slot: string; from: Condition; to: Condition }[];
  visitors: { id: PromoterVisitor; position: number; dnf: boolean }[];
  winningGap: number | null;
}

export interface PromoterMeet {
  charter: PromoterCharter;
  stewardship: Stewardship;
  guest: Vehicle;
  passes: number;
  results: PromoterRoundResult[];
  booking: PromoterBooking | null;
  clerkCall: RaceCall | null;
}

export interface PromoterArchiveEntry {
  season: number;
  charter: PromoterCharter;
  stewardship: Stewardship;
  guest: string;
  points: number;
  certified: boolean;
}

export interface PromoterState {
  clock: number;
  season: number;
  certified: PromoterCharter[];
  archive: PromoterArchiveEntry[];
  meet: PromoterMeet | null;
}

export type PromoterMove =
  | { type: "publish"; charter: PromoterCharter; stewardship: Stewardship; vehicleUid: string }
  | { type: "book"; call: RaceCall }
  | { type: "service"; slot: string }
  | { type: "tune"; tune: TuneSetting }
  | { type: "clerk"; call: RaceCall | null }
  | { type: "close" };

export function promoterGate(state: GameState): boolean {
  return (state.owner?.titles ?? 0) >= 1;
}

export function promoterCharterLock(state: GameState, charter: PromoterCharter): string | null {
  if ((state.promoter?.certified.length ?? 0) < PROMOTER_CHARTERS[charter].priorCharters) return "Certify a cup to invite the stock tour.";
  return null;
}

function scrutineering(vehicle: Vehicle): string | null {
  const slots = VEHICLE_BY_ID[vehicle.vehicleId].slots;
  const missing = slots.find(({ slot, required }) => required && !vehicle.parts[slot]);
  if (missing) return `Fit the ${missing.slot} before racing.`;
  const broken = Object.entries(vehicle.parts).find(([, part]) => part?.condition === 0);
  if (broken) return `The ${broken[0]} needs service before racing.`;
  return null;
}

export function promoterEligible(state: GameState, charter: PromoterCharter, vehicle: Vehicle): boolean {
  return vehicle.vehicleId === PROMOTER_CHARTERS[charter].vehicleId && !vehicleBusy(state, vehicle.uid) && !scrutineering(vehicle);
}

export function promoterReport(meet: PromoterMeet) {
  const charter = PROMOTER_CHARTERS[meet.charter];
  const finishes = meet.results.filter((result) => !result.dnf);
  const points = finishes.reduce((sum, result) => sum + (FINISH_POINTS[result.position - 1] ?? 0), 0);
  const podiums = finishes.filter((result) => result.position <= 3).length;
  const fieldFinishes = finishes.length + meet.results.reduce((sum, result) => sum + result.visitors.filter((entry) => !entry.dnf).length, 0);
  const closeFinishes = meet.results.filter(({ winningGap }) => winningGap !== null && winningGap <= CLOSE_FINISH_GAP).length;
  const rules = STEWARDSHIP[meet.stewardship];
  const complete = meet.results.length === charter.rounds.length;
  const qualified = complete && points >= charter.minimumPoints && finishes.length >= charter.minimumFinishes && podiums >= charter.minimumPodiums
    && fieldFinishes >= rules.finishes && closeFinishes >= rules.closeFinishes;
  return { points, finishes: finishes.length, podiums, fieldFinishes, closeFinishes, complete, qualified };
}

export function promoterBookingReason(meet: PromoterMeet): string | null {
  if (meet.booking) return "The next meeting is already booked.";
  if (promoterReport(meet).complete) return "All meetings have run. Close the calendar to publish the report.";
  return scrutineering(meet.guest);
}

function fixtureContext(state: GameState, meet: PromoterMeet, call: RaceCall) {
  const charter = PROMOTER_CHARTERS[meet.charter];
  const round = charter.rounds[meet.results.length];
  const context: GameState = {
    ...state,
    seed: `${state.seed}/promoter/${state.promoter?.season}/${meet.charter}/${meet.results.length}`,
    rng: 0,
    era: { discipline: "dirt", teamName: "Guest entry", colors: ["#000000", "#ffffff"], crew: [], milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0 },
    meta: initialMeta(),
    team: initialTeam(),
    config: initialConfig(),
    run: { ...initialRun(), vehicles: [meet.guest] },
  };
  const spec = { kind: "race" as const, ...round, call, vehicleUid: meet.guest.uid };
  const rating = getVenue(spec.venueId).events[spec.event].field;
  const pro = meet.stewardship === "pro";
  const grid: RaceGridEntry[] = Object.entries(PROMOTER_VISITORS).map(([id, visitor]) => ({
    id, rival: false,
    score: rating * (pro ? (visitor.pace + 1) * 0.53 : visitor.pace) * (visitor.preferred === spec.venueId ? 1.06 : 1),
    variation: pro ? 0.75 : 1.1,
    out: pro ? visitor.out : visitor.out * 0.35,
  }));
  return { context, spec, grid };
}

export function promoterRaceOdds(state: GameState, meet: PromoterMeet, call: RaceCall) {
  const { context, spec, grid } = fixtureContext(state, meet, call);
  return {
    win: winChance(context, meet.guest, spec.venueId, spec.event, call, undefined, grid),
    dnf: dnfChance(context, meet.guest, spec.venueId, spec.event, call),
  };
}

function book(state: GameState, meet: PromoterMeet, call: RaceCall, at: number): void {
  const { context, spec, grid } = fixtureContext(state, meet, call);
  const roll = rollRace(context, spec, grid);
  if (!roll?.grid) throw new Error("A sanctioned oval must classify the full grid");
  const wear: PromoterRoundResult["wear"] = [];
  for (const [slot, steps] of Object.entries(roll.wearSteps)) {
    const part = meet.guest.parts[slot];
    if (!part || part.condition === 0) continue;
    const from = part.condition;
    wear.push({ slot, from, to: Math.max(0, from - steps) as Condition });
  }
  meet.booking = {
    due: at + 10 * MINUTE + raceDurationMs(context, spec),
    result: {
      call, position: roll.position, fieldSize: roll.fieldSize, dnf: roll.dnf, weakestSlot: roll.weakestSlot, wear,
      visitors: roll.grid.entrants.map(({ id, position, dnf }) => ({ id: id as PromoterVisitor, position, dnf })),
      winningGap: roll.grid.winningGap,
    },
  };
}

export function advancePromoter(state: GameState, ms: number): void {
  const promoter = state.promoter;
  if (!promoter?.meet || !Number.isFinite(ms) || ms <= 0) return;
  const meet = promoter.meet;
  const end = promoter.clock + ms;
  while (meet.booking && meet.booking.due <= end) {
    const { due, result } = meet.booking;
    for (const { slot, to } of result.wear) {
      const part = meet.guest.parts[slot];
      if (part) part.condition = to;
    }
    meet.results.push(result);
    meet.booking = null;
    // The clerk can schedule a signed-off race but leaves any scrutineering problem for you.
    if (meet.clerkCall && !promoterBookingReason(meet)) book(state, meet, meet.clerkCall, due);
  }
  promoter.clock = end;
}

export function applyPromoter(state: GameState, move: PromoterMove): string | null {
  if (!promoterGate(state)) return "Win an Owner championship to open the circuit office.";
  const current = state.promoter;
  if (move.type === "publish") {
    if (current?.meet) return "Close the current calendar first.";
    if (!Object.hasOwn(PROMOTER_CHARTERS, move.charter)) return "Choose a circuit charter.";
    if (!Object.hasOwn(STEWARDSHIP, move.stewardship)) return "Choose how to steward the grid.";
    const lock = promoterCharterLock(state, move.charter);
    if (lock) return lock;
    const vehicle = state.run.vehicles.find(({ uid }) => uid === move.vehicleUid);
    if (!vehicle || !promoterEligible(state, move.charter, vehicle)) return "Choose a race-ready vehicle in the charter's class.";
    const promoter = current ?? { clock: 0, season: 0, certified: [], archive: [], meet: null };
    promoter.season += 1;
    promoter.meet = {
      charter: move.charter, stewardship: move.stewardship, guest: structuredClone(vehicle), passes: PROMOTER_CHARTERS[move.charter].passes,
      results: [], booking: null, clerkCall: null,
    };
    state.promoter = promoter;
    return null;
  }
  const meet = current?.meet;
  if (!current || !meet) return "Publish a circuit calendar first.";

  switch (move.type) {
    case "book": {
      if (move.call !== "push" && move.call !== "nurse") return "Choose a race pace.";
      const reason = promoterBookingReason(meet);
      if (reason) return reason;
      book(state, meet, move.call, current.clock);
      return null;
    }
    case "service": {
      if (meet.booking || promoterReport(meet).complete) return "Service is available between meetings.";
      if (meet.passes === 0) return "No workshop passes remain on this calendar.";
      const part = Object.hasOwn(meet.guest.parts, move.slot) ? meet.guest.parts[move.slot] : undefined;
      if (!part || part.condition >= 3) return "Choose a part below Good condition.";
      part.condition = 3;
      meet.passes -= 1;
      if (meet.clerkCall && !promoterBookingReason(meet)) book(state, meet, meet.clerkCall, current.clock);
      return null;
    }
    case "tune":
      if (meet.booking || promoterReport(meet).complete) return "Change the setup between meetings.";
      if (move.tune !== "balanced" && move.tune !== "power" && move.tune !== "reliable") return "Choose a racing setup.";
      meet.guest.tune = move.tune;
      return null;
    case "clerk":
      if (current.certified.length === 0) return "Qualify a calendar to earn a clerk.";
      if (move.call !== null && move.call !== "push" && move.call !== "nurse") return "Choose a clerk pace.";
      if (promoterReport(meet).complete) return "The calendar is complete.";
      meet.clerkCall = move.call;
      if (move.call && !promoterBookingReason(meet)) book(state, meet, move.call, current.clock);
      return null;
    case "close": {
      if (meet.booking) return "Wait for the current meeting to finish.";
      const { points, qualified } = promoterReport(meet);
      if (qualified && !current.certified.includes(meet.charter)) current.certified.push(meet.charter);
      current.archive.unshift({ season: current.season, charter: meet.charter, stewardship: meet.stewardship, guest: meet.guest.name, points, certified: qualified });
      current.archive.splice(ARCHIVE_LIMIT);
      current.meet = null;
      return null;
    }
  }
}
