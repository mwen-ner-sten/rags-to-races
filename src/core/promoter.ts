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
  finale: Round;
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
    finale: { venueId: "dirt", event: "heat" },
    passes: 3, minimumFinishes: 2, minimumPoints: 8, minimumPodiums: 1, priorCharters: 0,
  },
  ironworks: {
    name: "Ironworks Trophy",
    brief: "The same kart tackles the rough Dirt Track and the County Fair straights. One workshop pass has to cover the whole calendar.",
    vehicleId: "go_kart",
    rounds: [{ venueId: "dirt", event: "heat" }, { venueId: "county_fair", event: "sprint" }, { venueId: "dirt", event: "feature" }],
    finale: { venueId: "county_fair", event: "feature" },
    passes: 1, minimumFinishes: 3, minimumPoints: 9, minimumPodiums: 1, priorCharters: 0,
  },
  midnight: {
    name: "Midnight Stock Tour",
    brief: "Take a Street Stock through technical Regional rounds and the fast State finale. The visiting works teams are watching.",
    vehicleId: "street_stock",
    rounds: [{ venueId: "regional", event: "heat" }, { venueId: "regional", event: "feature" }, { venueId: "state", event: "feature" }],
    finale: { venueId: "state", event: "heat" },
    passes: 2, minimumFinishes: 2, minimumPoints: 8, minimumPodiums: 1, priorCharters: 1,
  },
} as const satisfies Record<string, Charter>;

export type PromoterCharter = keyof typeof PROMOTER_CHARTERS;

export const STEWARDSHIP = {
  paddock: { name: "Open Paddock", brief: "Loan the visitors tools and reduce breakdowns across the field.", finishes: 14, closeFinishes: 0, winners: 0 },
  pro: { name: "Close Grid", brief: "Invite a quicker, closely matched field. If your guest is running away with the race, try Nurse or enter a less powerful build.", finishes: 10, closeFinishes: 2, winners: 0 },
  handicap: { name: "Success Handicap", brief: "The points leader carries ballast at the next meeting. Give more than one entrant a shot at a win.", finishes: 12, closeFinishes: 0, winners: 2 },
} as const;

export type Stewardship = keyof typeof STEWARDSHIP;

export const PROMOTER_ROUTES = {
  classic: { name: "Original calendar", detail: "The charter’s published route." },
  reverse: { name: "Reverse calendar", detail: "Start with the charter’s finale while the guest is fresh." },
  extended: { name: "Extended calendar", detail: "Run an extra Feature or Heat. The field and guest need stronger results, and you get one extra workshop pass." },
} as const;

export type PromoterRoute = keyof typeof PROMOTER_ROUTES;
export type PromoterClerkCall = RaceCall | "adaptive";

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
  aidedVisitor?: PromoterVisitor;
}

export interface PromoterMeet {
  charter: PromoterCharter;
  stewardship: Stewardship;
  guest: Vehicle;
  passes: number;
  results: PromoterRoundResult[];
  booking: PromoterBooking | null;
  clerkCall: PromoterClerkCall | null;
  pendingAid?: PromoterVisitor;
  route?: PromoterRoute;
  workshopBid?: boolean;
  autoService?: boolean;
  clerkServices?: string[];
  returning?: boolean;
}

export interface PromoterArchiveEntry {
  season: number;
  charter: PromoterCharter;
  stewardship: Stewardship;
  guest: string;
  points: number;
  certified: boolean;
  winner?: PromoterEntrant;
  route?: PromoterRoute;
  workshopBid?: boolean;
  workshopEarned?: boolean;
}

export interface PromoterState {
  clock: number;
  season: number;
  certified: PromoterCharter[];
  archive: PromoterArchiveEntry[];
  meet: PromoterMeet | null;
  visitorForm?: Partial<Record<PromoterVisitor, number>>;
  policyMastery?: Partial<Record<Stewardship, PromoterCharter[]>>;
  workshopLicensed?: boolean;
  reserveGuest?: Vehicle;
}

export type PromoterMove =
  | { type: "publish"; charter: PromoterCharter; stewardship: Stewardship; vehicleUid: string; route?: PromoterRoute; workshopBid?: boolean; returning?: boolean }
  | { type: "book"; call: RaceCall }
  | { type: "service"; slot: string }
  | { type: "aid"; visitor: PromoterVisitor }
  | { type: "tune"; tune: TuneSetting }
  | { type: "clerk"; call: PromoterClerkCall | null }
  | { type: "clerk-service"; enabled: boolean }
  | { type: "close" };

export function promoterGate(state: GameState): boolean {
  return (state.owner?.titles ?? 0) >= 1;
}

export function promoterCharterLock(state: GameState, charter: PromoterCharter): string | null {
  if ((state.promoter?.certified.length ?? 0) < PROMOTER_CHARTERS[charter].priorCharters) return "Certify a cup to invite the stock tour.";
  return null;
}

export function promoterPolicyLock(state: GameState, stewardship: Stewardship): string | null {
  return stewardship === "handicap" && !state.promoter?.certified.length ? "Certify a calendar to use Success Handicap." : null;
}

export function promoterRouteLock(state: GameState, charter: PromoterCharter, route: PromoterRoute): string | null {
  const certified = state.promoter?.certified ?? [];
  if (route === "reverse" && !certified.includes(charter)) return "Certify this charter to reverse its route.";
  if (route === "extended" && certified.length < 2) return "Certify two different charters to add an extra meeting.";
  return null;
}

export function promoterSchedule(charter: PromoterCharter, route?: PromoterRoute): readonly Round[] {
  const def = PROMOTER_CHARTERS[charter];
  if (route === "reverse") return [...def.rounds].reverse();
  if (route === "extended") return [...def.rounds, def.finale];
  return def.rounds;
}

export function promoterTargets(charter: PromoterCharter, stewardship: Stewardship, route?: PromoterRoute) {
  const def = PROMOTER_CHARTERS[charter];
  const rules = STEWARDSHIP[stewardship];
  const long = route === "extended";
  return {
    passes: def.passes + Number(long), points: def.minimumPoints + (long ? 4 : 0),
    podiums: def.minimumPodiums, finishes: def.minimumFinishes + Number(long),
    fieldFinishes: rules.finishes + (long ? 4 : 0), closeFinishes: rules.closeFinishes + Number(long && rules.closeFinishes > 0), winners: rules.winners,
  };
}

export function promoterMastery(state: GameState): Partial<Record<Stewardship, PromoterCharter[]>> {
  const progress = structuredClone(state.promoter?.policyMastery ?? {});
  for (const entry of state.promoter?.archive ?? []) {
    if (!entry.certified) continue;
    const charters = progress[entry.stewardship] ??= [];
    if (!charters.includes(entry.charter)) charters.push(entry.charter);
  }
  return progress;
}

export function adaptiveClerkEarned(state: GameState): boolean {
  return Object.values(promoterMastery(state)).filter((charters) => charters.length > 0).length >= 2;
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

export type PromoterEntrant = PromoterVisitor | "guest";

export function promoterStandings(meet: PromoterMeet) {
  const ids: PromoterEntrant[] = ["guest", ...Object.keys(PROMOTER_VISITORS) as PromoterVisitor[]];
  const field = ids.map((id) => {
    const finishes = meet.results.flatMap((round) => {
      const result = id === "guest" ? round : round.visitors.find((entry) => entry.id === id);
      return result && !result.dnf ? [result.position] : [];
    }).sort((a, b) => a - b);
    return { id, starts: meet.results.length, finishes, points: finishes.reduce((total, place) => total + (FINISH_POINTS[place - 1] ?? 0), 0) };
  });
  return field.sort((a, b) => {
    const byPoints = b.points - a.points;
    if (byPoints) return byPoints;
    for (let place = 1; place <= FINISH_POINTS.length; place += 1) {
      const difference = b.finishes.filter((finish) => finish === place).length - a.finishes.filter((finish) => finish === place).length;
      if (difference) return difference;
    }
    return a.id.localeCompare(b.id);
  });
}

export function promoterVisitorWear(meet: PromoterMeet, visitor: PromoterVisitor): number {
  let wear = 0;
  for (const round of meet.results) {
    if (round.aidedVisitor === visitor) wear = 0;
    if (round.visitors.some((entry) => entry.id === visitor && entry.dnf)) wear += 1;
  }
  return Math.min(2, wear);
}

export function promoterBallast(meet: PromoterMeet): PromoterEntrant | null {
  if (meet.stewardship !== "handicap" || !meet.results.length) return null;
  const leader = promoterStandings(meet)[0];
  return leader.points ? leader.id : null;
}

export function promoterGrid(state: GameState, meet: PromoterMeet, round: Round): RaceGridEntry[] {
  const rating = getVenue(round.venueId).events[round.event].field;
  const pro = meet.stewardship === "pro";
  const ballast = promoterBallast(meet);
  return (Object.keys(PROMOTER_VISITORS) as PromoterVisitor[]).map((id) => {
    const visitor = PROMOTER_VISITORS[id];
    const form = state.promoter?.visitorForm?.[id] ?? 0;
    const wear = id === meet.pendingAid ? 0 : promoterVisitorWear(meet, id);
    return {
      id, rival: false,
      score: rating * (pro ? (visitor.pace + 1) * 0.53 : visitor.pace) * (visitor.preferred === round.venueId ? 1.06 : 1) * (1 + 0.025 * form) * (1 - 0.03 * wear)
        * (ballast === id ? 0.83 : 1) / (ballast === "guest" ? 0.83 : 1),
      variation: pro ? 0.75 : 1.1,
      out: (pro ? visitor.out : visitor.out * 0.35) + 0.06 * wear,
    };
  });
}

export function promoterReport(meet: PromoterMeet) {
  const targets = promoterTargets(meet.charter, meet.stewardship, meet.route);
  const finishes = meet.results.filter((result) => !result.dnf);
  const points = finishes.reduce((sum, result) => sum + (FINISH_POINTS[result.position - 1] ?? 0), 0);
  const podiums = finishes.filter((result) => result.position <= 3).length;
  const fieldFinishes = finishes.length + meet.results.reduce((sum, result) => sum + result.visitors.filter((entry) => !entry.dnf).length, 0);
  const closeFinishes = meet.results.filter(({ winningGap }) => winningGap !== null && winningGap <= CLOSE_FINISH_GAP).length;
  const winners = new Set(meet.results.flatMap((round) => [
    ...(!round.dnf && round.position === 1 ? ["guest"] : []),
    ...round.visitors.filter((entrant) => !entrant.dnf && entrant.position === 1).map(({ id }) => id),
  ])).size;
  const complete = meet.results.length === promoterSchedule(meet.charter, meet.route).length;
  const qualified = complete && points >= targets.points && finishes.length >= targets.finishes && podiums >= targets.podiums
    && fieldFinishes >= targets.fieldFinishes && closeFinishes >= targets.closeFinishes && winners >= targets.winners;
  return { points, finishes: finishes.length, podiums, fieldFinishes, closeFinishes, winners, complete, qualified };
}

export function promoterBookingReason(meet: PromoterMeet): string | null {
  if (meet.booking) return "The next meeting is already booked.";
  if (promoterReport(meet).complete) return "All meetings have run. Close the calendar to publish the report.";
  return scrutineering(meet.guest);
}

function fixtureContext(state: GameState, meet: PromoterMeet, call: RaceCall) {
  const round = promoterSchedule(meet.charter, meet.route)[meet.results.length];
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
  const grid = promoterGrid(state, meet, round);
  return { context, spec, grid };
}

export function promoterRaceOdds(state: GameState, meet: PromoterMeet, call: RaceCall) {
  const { context, spec, grid } = fixtureContext(state, meet, call);
  return {
    win: winChance(context, meet.guest, spec.venueId, spec.event, call, undefined, grid),
    dnf: dnfChance(context, meet.guest, spec.venueId, spec.event, call),
  };
}

export function promoterClerkPace(state: GameState, meet: PromoterMeet): RaceCall | null {
  if (meet.clerkCall !== "adaptive") return meet.clerkCall;
  if (meet.stewardship === "pro") return "nurse";
  const push = promoterRaceOdds(state, meet, "push");
  const nurse = promoterRaceOdds(state, meet, "nurse");
  return push.dnf <= 0.1 && push.win >= nurse.win + 0.05 ? "push" : "nurse";
}

export function promoterWorkshopEarned(meet: PromoterMeet): boolean {
  return !!meet.workshopBid && promoterReport(meet).qualified && meet.passes >= 1 && !scrutineering(meet.guest);
}

function bookClerk(state: GameState, meet: PromoterMeet, at: number): void {
  if (!meet.clerkCall || meet.booking || promoterReport(meet).complete) return;
  const unsafe = Object.entries(meet.guest.parts).filter(([, part]) => part?.condition === 0);
  if (meet.autoService && unsafe.length > 0 && unsafe.length <= meet.passes) {
    for (const [slot, part] of unsafe) {
      if (!part) continue;
      part.condition = 3;
      meet.passes -= 1;
      (meet.clerkServices ??= []).push(slot);
    }
  }
  if (promoterBookingReason(meet)) return;
  const call = promoterClerkPace(state, meet);
  if (call) book(state, meet, call, at);
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
      ...(meet.pendingAid && { aidedVisitor: meet.pendingAid }),
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
    delete meet.pendingAid;
    // The clerk can schedule a signed-off race but leaves any scrutineering problem for you.
    bookClerk(state, meet, due);
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
    const route = move.route ?? "classic";
    if (!Object.hasOwn(PROMOTER_ROUTES, route)) return "Choose a calendar route.";
    const lock = promoterCharterLock(state, move.charter) ?? promoterPolicyLock(state, move.stewardship) ?? promoterRouteLock(state, move.charter, route);
    if (lock) return lock;
    if (move.workshopBid && !current?.certified.length) return "Certify a calendar before bidding for a workshop license.";
    const returning = move.returning === true;
    const vehicle = returning ? current?.reserveGuest : state.run.vehicles.find(({ uid }) => uid === move.vehicleUid);
    if (!vehicle || vehicle.uid !== move.vehicleUid || vehicle.vehicleId !== PROMOTER_CHARTERS[move.charter].vehicleId
      || (!returning && !promoterEligible(state, move.charter, vehicle))) return "Choose a race-ready vehicle in the charter's class.";
    const promoter: PromoterState = current ?? { clock: 0, season: 0, certified: [], archive: [], meet: null };
    promoter.season += 1;
    promoter.meet = {
      charter: move.charter, stewardship: move.stewardship, guest: structuredClone(vehicle), passes: promoterTargets(move.charter, move.stewardship, route).passes + Number(returning),
      results: [], booking: null, clerkCall: null,
      ...(route !== "classic" && { route }), ...(move.workshopBid && { workshopBid: true }), ...(returning && { returning: true }),
    };
    if (returning) delete promoter.reserveGuest;
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
      bookClerk(state, meet, current.clock);
      return null;
    }
    case "aid":
      if (meet.booking || promoterReport(meet).complete) return "Help visitors between meetings.";
      if (!Object.hasOwn(PROMOTER_VISITORS, move.visitor) || !promoterVisitorWear(meet, move.visitor)) return "Choose a visitor who needs work after a breakdown.";
      if (!meet.passes) return "No workshop passes remain on this calendar.";
      if (meet.pendingAid) return "Only one visitor can use the workshop before this meeting.";
      meet.pendingAid = move.visitor;
      meet.passes -= 1;
      return null;
    case "tune":
      if (meet.booking || promoterReport(meet).complete) return "Change the setup between meetings.";
      if (move.tune !== "balanced" && move.tune !== "power" && move.tune !== "reliable") return "Choose a racing setup.";
      meet.guest.tune = move.tune;
      return null;
    case "clerk":
      if (current.certified.length === 0) return "Qualify a calendar to earn a clerk.";
      if (move.call === "adaptive" && !adaptiveClerkEarned(state)) return "Certify calendars under two policies to earn adaptive booking.";
      if (move.call !== null && move.call !== "push" && move.call !== "nurse" && move.call !== "adaptive") return "Choose a clerk pace.";
      if (promoterReport(meet).complete) return "The calendar is complete.";
      meet.clerkCall = move.call;
      bookClerk(state, meet, current.clock);
      return null;
    case "clerk-service":
      if (!current.workshopLicensed) return "Fulfill a workshop bid to delegate safety work.";
      if (promoterReport(meet).complete) return "The calendar is complete.";
      meet.autoService = move.enabled;
      bookClerk(state, meet, current.clock);
      return null;
    case "close": {
      if (meet.booking) return "Wait for the current meeting to finish.";
      const { points, qualified, complete } = promoterReport(meet);
      if (qualified && !current.certified.includes(meet.charter)) current.certified.push(meet.charter);
      if (qualified) {
        const mastery = promoterMastery(state);
        const charters = mastery[meet.stewardship] ??= [];
        if (!charters.includes(meet.charter)) charters.push(meet.charter);
        current.policyMastery = mastery;
        current.reserveGuest = structuredClone(meet.guest);
      }
      const workshopEarned = promoterWorkshopEarned(meet);
      if (workshopEarned) current.workshopLicensed = true;
      const champion = promoterStandings(meet)[0];
      const winner = complete && champion.points > 0 ? champion.id : undefined;
      if (winner && winner !== "guest") {
        const form = current.visitorForm ??= {};
        form[winner] = Math.min(3, (form[winner] ?? 0) + 1);
      }
      current.archive.unshift({ season: current.season, charter: meet.charter, stewardship: meet.stewardship, guest: meet.guest.name, points, certified: qualified,
        ...(winner && { winner }), ...(meet.route && { route: meet.route }), ...(meet.workshopBid && { workshopBid: true, workshopEarned }) });
      current.archive.splice(ARCHIVE_LIMIT);
      current.meet = null;
      return null;
    }
  }
}
