import { getVenue } from "./content/events";
import { CLUB_COURSES, clubLoanOrigin, type ClubCourseId } from "./clubTrack";
import { COUNTY_RIVALS, countyLoanOrigin, countyLoanProvenance, countyVisitorLoanBlocker, type CountyRivalId } from "./countyRivals";
import { enqueue, jobBlocker } from "./jobs";
import { logSeason } from "./journal";
import { nextUid } from "./rng";
import type { EventKind, GameState, JobSpec, RaceCall, RaceResult, Vehicle } from "./types";

interface ClubStop {
  venueId: string;
  event: EventKind;
  vehicleId: string;
  publicCost: number;
}

interface ClubDefinition {
  name: string;
  opening: string;
  stops: readonly ClubStop[];
  points: number;
  finishes: number;
  publicFinishes: number;
  grant: number;
  rep: number;
}

export const CLUB_CHARTERS = {
  yard_co_op: {
    name: "Backyard Co-op",
    opening: "Start with a Worn Lawn Mower Engine and Worn Basic Wheels. Run two mower-class meetings in the Backyard and two at the Dirt Track.",
    stops: [
      { venueId: "backyard", event: "sprint", vehicleId: "push_mower", publicCost: 0 },
      { venueId: "backyard", event: "feature", vehicleId: "push_mower", publicCost: 4 },
      { venueId: "dirt", event: "sprint", vehicleId: "riding_mower", publicCost: 6 },
      { venueId: "dirt", event: "feature", vehicleId: "riding_mower", publicCost: 10 },
    ],
    points: 17, finishes: 3, publicFinishes: 2, grant: 55, rep: 5,
  },
  fairground_guild: {
    name: "Fairground Guild",
    opening: "Start with 120 Scrap Bucks, 3 metal and 2 rubber to get a kart on the grid. Alternate between the Dirt Track and the County Fair.",
    stops: [
      { venueId: "dirt", event: "heat", vehicleId: "go_kart", publicCost: 7 },
      { venueId: "county_fair", event: "sprint", vehicleId: "go_kart", publicCost: 10 },
      { venueId: "dirt", event: "feature", vehicleId: "go_kart", publicCost: 14 },
      { venueId: "county_fair", event: "feature", vehicleId: "go_kart", publicCost: 20 },
    ],
    points: 23, finishes: 3, publicFinishes: 1, grant: 150, rep: 8,
  },
} as const satisfies Record<string, ClubDefinition>;

export const CLUB_HISTORY_LIMIT = 20;
const POINTS = [10, 7, 5, 3, 2, 1];
export type ClubCharter = keyof typeof CLUB_CHARTERS;
export type ClubAdmission = "public" | "ticketed";
type RaceSpec = Extract<JobSpec, { kind: "race" }>;

export interface ClubFinish {
  raceId: string;
  vehicle: string;
  admission: ClubAdmission;
  position: number;
  fieldSize: number;
  dnf: boolean;
  call?: RaceCall;
}

export interface ClubSeason {
  season: number;
  charter: ClubCharter;
  rounds: ClubFinish[];
  course?: ClubCourseId;
}

export interface ClubArchive extends ClubSeason {
  status: "certified" | "finished" | "retired";
}

export interface ClubState {
  active: ClubSeason | null;
  history: ClubArchive[];
  hasCertifiedClub?: true;
  trackLicenses?: ClubCourseId[];
}

export type ClubMove = { type: "enter"; vehicleUid: string; admission: ClubAdmission; call: RaceCall };

export function clubGate(state: GameState): string | null {
  return new Set(state.promoter?.certified).size >= 2 ? null : "Certify two different Circuit charters to found a club.";
}

export function clubCourseGate(state: GameState): string | null {
  const club = state.club;
  if (club?.hasCertifiedClub || club?.history.some(({ status }) => status === "certified") || (club?.active && clubScore(club.active).certified)) return null;
  return "Certify a Grassroots Club calendar to build your own layout.";
}

export function clubChoicesBlocker(state: GameState, charter: ClubCharter | undefined, course?: ClubCourseId, loan?: ClubCourseId, visitor?: CountyRivalId): string | null {
  if (!charter && (course || loan || visitor)) return "Choose a club charter before selecting a track or workshop loan.";
  if (charter === undefined) return null;
  if (!Object.hasOwn(CLUB_CHARTERS, charter)) return "Choose a club charter.";
  if (course !== undefined && !Object.hasOwn(CLUB_COURSES, course)) return "Choose a track layout.";
  if (loan !== undefined && !state.club?.trackLicenses?.includes(loan)) return "Certify that track before borrowing its part.";
  if (visitor && loan) return "Choose one workshop loan from a track or a county visitor.";
  return clubGate(state) ?? (course ? clubCourseGate(state) : null) ?? countyVisitorLoanBlocker(state, visitor);
}

export function clubScore(season: ClubSeason) {
  const charter = CLUB_CHARTERS[season.charter];
  const finishers = season.rounds.filter(({ dnf }) => !dnf);
  const points = finishers.reduce((total, { position }) => total + (POINTS[position - 1] ?? 0), 0);
  const publicFinishes = finishers.filter(({ admission }) => admission === "public").length;
  const complete = season.rounds.length === charter.stops.length;
  const certified = complete && points >= charter.points && finishers.length >= charter.finishes && publicFinishes >= charter.publicFinishes;
  const course = season.course ? CLUB_COURSES[season.course] : undefined;
  const coursePodiums = course ? finishers.filter(({ call, position }) => call === course.proofCall && position <= 3).length : 0;
  const trackCertified = certified && !!course && coursePodiums >= course.podiums;
  return { points, finishes: finishers.length, publicFinishes, complete, certified, coursePodiums, trackCertified };
}

export function clubRoundToken(season: ClubSeason): string {
  return `club:${season.season}:${season.rounds.length}`;
}

export function clubEntryStatus(state: GameState): "queued" | "racing" | null {
  if (!state.club?.active) return null;
  const round = clubRoundToken(state.club.active);
  const matches = (spec: JobSpec) => spec.kind === "race" && spec.clubRound?.token === round;
  if (state.run.jobs.some(({ spec }) => matches(spec))) return "racing";
  return state.run.queue.some(matches) ? "queued" : null;
}

export function clubSpecMatches(state: GameState, spec: RaceSpec, vehicle?: Vehicle): boolean {
  const season = state.club?.active;
  if (!season || spec.clubRound?.token !== clubRoundToken(season) || spec.tourRound !== undefined) return false;
  const stop = CLUB_CHARTERS[season.charter].stops[season.rounds.length];
  const entry = vehicle ?? state.run.vehicles.find(({ uid }) => uid === spec.vehicleUid);
  return !!stop && stop.venueId === spec.venueId && stop.event === spec.event && entry?.vehicleId === stop.vehicleId;
}

export function clubHostingCost(state: GameState, spec: RaceSpec): number {
  const season = state.club?.active;
  if (!season || spec.clubRound?.token !== clubRoundToken(season)) return 0;
  const stop = CLUB_CHARTERS[season.charter].stops[season.rounds.length];
  return stop ? (spec.clubRound.admission === "public" ? stop.publicCost : 0) + courseCost(season.course) : 0;
}

export function clubEntryBlocker(state: GameState, vehicleUid: string, admission: ClubAdmission, call: RaceCall): string | null {
  const season = state.club?.active;
  if (!season) return "Found a club at your next Scrap Reset.";
  const stop = CLUB_CHARTERS[season.charter].stops[season.rounds.length];
  if (!stop) return "The club calendar has finished.";
  if (admission !== "public" && admission !== "ticketed") return "Choose a gate policy.";
  if (call !== "push" && call !== "nurse") return "Choose a race pace.";
  if (clubEntryStatus(state)) return "This club meeting already has an entry.";
  const spec: RaceSpec = { kind: "race", venueId: stop.venueId, event: stop.event, vehicleUid, call, clubRound: { token: clubRoundToken(season), admission } };
  if (!clubSpecMatches(state, spec)) return "Choose a car from this meeting’s class.";
  return jobBlocker(state, spec, true);
}

export function applyClub(state: GameState, move: ClubMove): string | null {
  const reason = clubEntryBlocker(state, move.vehicleUid, move.admission, move.call);
  if (reason) return reason;
  const season = state.club!.active!;
  const { venueId, event } = CLUB_CHARTERS[season.charter].stops[season.rounds.length];
  return enqueue(state, {
    kind: "race", venueId, event, vehicleUid: move.vehicleUid, call: move.call,
    clubRound: { token: clubRoundToken(season), admission: move.admission },
  });
}

export function recordClubRace(state: GameState, spec: RaceSpec, result: RaceResult): void {
  const season = state.club?.active;
  const car = state.run.vehicles.find(({ uid }) => uid === result.vehicleUid);
  if (!season || !car || !spec.clubRound || spec.vehicleUid !== result.vehicleUid || !clubSpecMatches(state, spec, car)) return;
  const { admission } = spec.clubRound;
  const stop = CLUB_CHARTERS[season.charter].stops[season.rounds.length];
  season.rounds.push({ raceId: result.id, vehicle: car.name, admission, position: result.position, fieldSize: result.fieldSize, dnf: result.dnf, ...(season.course && { call: spec.call }) });
  if (!result.dnf && admission === "public") state.run.rep += 2;
  if (!result.dnf && result.position <= 3 && admission === "ticketed") state.run.cash += ticketedGrant(stop);
  const tally = clubScore(season);
  if (!tally.complete) return;
  const charter = CLUB_CHARTERS[season.charter];
  if (tally.certified) {
    state.club!.hasCertifiedClub = true;
    state.run.cash += charter.grant;
    state.run.rep += charter.rep;
  }
  if (tally.trackCertified && season.course) {
    const licenses = state.club!.trackLicenses ??= [];
    if (!licenses.includes(season.course)) {
      licenses.push(season.course);
      logSeason(state, `club:track:${season.course}`, `${CLUB_COURSES[season.course].name} certified. Its workshop part can be borrowed at future Club resets.`);
    }
  }
  logSeason(state, `club:${season.season}`, tally.certified
    ? `${charter.name} certified with ${tally.points} points. The board awarded ${charter.grant} Scrap Bucks and ${charter.rep} Rep.`
    : `${charter.name} finished with ${tally.points} points and ${tally.publicFinishes} public finishes.`);
}

export function ticketedGrant(stop: ClubStop): number {
  return Math.max(5, stop.publicCost);
}

function courseCost(course: ClubCourseId | undefined): number {
  return course ? CLUB_COURSES[course].surcharge : 0;
}

export function clubEntryPrice(stop: ClubStop, admission: ClubAdmission, course?: ClubCourseId): number {
  return getVenue(stop.venueId).events[stop.event].entry + (admission === "public" ? stop.publicCost : 0) + courseCost(course);
}

export function archiveClubSeason(state: GameState): void {
  const club = state.club;
  const season = club?.active;
  if (!club || !season) return;
  const report = clubScore(season);
  club.history.unshift({ ...season, status: report.certified ? "certified" : report.complete ? "finished" : "retired" });
  club.history.splice(CLUB_HISTORY_LIMIT);
  club.active = null;
}

export function startClubSeason(state: GameState): void {
  const charter = state.config.club;
  if (!charter) return;
  const club = state.club ??= { active: null, history: [] };
  const { clubCourse, clubLoan, clubVisitor } = state.config;
  club.active = { charter, season: state.meta.seasonsPlayed + 1, rounds: [], ...(clubCourse && { course: clubCourse }) };
  if (charter === "yard_co_op") {
    for (const partId of ["engine_lawn", "wheel_basic"]) addClubPart(state, partId, 2, "Backyard Co-op");
  } else {
    state.run.cash += 120;
    state.run.materials.metal += 3;
    state.run.materials.rubber += 2;
  }
  if (clubLoan) {
    const course = CLUB_COURSES[clubLoan];
    addClubPart(state, course.loanPart, 3, clubLoanOrigin(clubLoan));
  }
  if (clubVisitor) addClubPart(state, COUNTY_RIVALS[clubVisitor].part, 3, countyLoanOrigin(clubVisitor), countyLoanProvenance(state, clubVisitor));
  logSeason(state, `club:found:${club.active.season}`, `${CLUB_CHARTERS[charter].name} opened its first meeting. Check the Club calendar for the eligible class.`);
}

function addClubPart(state: GameState, partId: string, condition: 2 | 3, origin: string, provenance?: import("./types").PartProvenance): void {
  state.run.inventory.push({ uid: nextUid(state, "p"), partId, condition, origin, ...(provenance && { provenance }) });
  state.meta.codex.parts[partId] = (state.meta.codex.parts[partId] ?? 0) + 1;
}
