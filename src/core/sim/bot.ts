/**
 * A greedy player for pacing simulation. It plays through the same actions
 * the UI dispatches, on a schedule of visits, and records when milestones
 * happen. It is deliberately reasonable, not optimal.
 */
import { apply, counterBlocker, type Action } from "../actions";
import { counterPrice } from "../garage";
import { DISCIPLINES, EVENT_KINDS, VENUES, getVenue } from "../content/events";
import { CONDITION_STAT, REPAIR_TECHNIQUE, STRIP_YIELD, getPart } from "../content/parts";
import { PLACES, getPlace } from "../content/places";
import { CREW_BY_ID, TEAM_UPGRADES } from "../content/team";
import { TOOLS } from "../content/tools";
import { VEHICLES, getVehicle } from "../content/vehicles";
import { channel } from "../channels";
import { reservedPartUids, vehicleBusy } from "../garage";
import { templateBase } from "../habits";
import { isBenchKind, jobBlocker } from "../jobs";
import { canOpenPlace } from "../knowhowEngine";
import { planPurchases, crewCap, nextSeasonPerkSlots, nextSeasonTuneUpPoints, LAYERS, type ScrapChoices, type TeamChoices } from "../layers";
import { winChance } from "../race";
import { resolveFlags } from "../rules";
import type { DisciplineId, EventKind, GameState, JobSpec, PartInstance, Vehicle } from "../types";

const MIN = 60_000;
const HOUR = 60 * MIN;

export type RunPolicy = "sprint" | "push";

export interface Schedule {
  name: string;
  /** Visit start times within a day, in hours, and the visit length in minutes. */
  visits: number[];
  visitMinutes: number;
}

export const SCHEDULES: Record<string, Schedule> = {
  mixed: { name: "4 visits/day × 15 min", visits: [8, 12.5, 18, 22], visitMinutes: 15 },
  daily: { name: "1 visit/day × 5 min", visits: [9], visitMinutes: 5 },
  active: { name: "6 visits/day × 30 min", visits: [7, 10, 13, 16, 19, 22], visitMinutes: 30 },
};

export interface MilestoneLog {
  [key: string]: number; // ms of total game time when first reached
}

export class Bot {
  state: GameState;
  totalMs = 0;
  seasonStartMs = 0;
  log: MilestoneLog = {};
  seasonLog: { season: number; ms: number; lp: number; policy: RunPolicy; venues: string[] }[] = [];
  errors: string[] = [];

  constructor(state: GameState, public policy: RunPolicy = "sprint", public discipline: DisciplineId = "dirt") {
    this.state = state;
  }

  private act(action: Action): boolean {
    const result = apply(this.state, action);
    if (result.error) return false;
    this.state = result.state;
    return true;
  }

  private mark(key: string): void {
    if (this.log[key] === undefined) this.log[key] = this.totalMs;
  }

  private advance(ms: number, away: boolean): void {
    this.act({ type: "advance", ms, away });
    this.totalMs += ms;
    this.recordMilestones();
  }

  private recordMilestones(): void {
    const s = this.state;
    const season = s.meta.seasonsPlayed + 1;
    for (const v of s.run.vehicles) this.mark(`s${season}:build:${v.vehicleId}`);
    for (const venue of Object.keys(s.run.featureWins)) this.mark(`s${season}:feature:${venue}`);
    if (s.run.races.some((r) => r.position === 1 && !r.dnf)) this.mark(`s${season}:first_win`);
  }

  /** Plays until `untilMs` of total time, following the schedule. */
  run(schedule: Schedule, untilMs: number, maxSeasons = 50): void {
    while (this.totalMs < untilMs && this.seasonLog.length < maxSeasons) {
      const dayMs = this.totalMs % (24 * HOUR);
      const dayStart = this.totalMs - dayMs;
      const nextVisit = schedule.visits.map((h) => dayStart + h * HOUR).find((t) => t >= this.totalMs) ?? dayStart + 24 * HOUR + schedule.visits[0] * HOUR;
      this.prepareToLeave();
      this.advance(nextVisit - this.totalMs, true);
      this.visit(schedule.visitMinutes * MIN);
    }
  }

  private visit(lengthMs: number): void {
    const end = this.totalMs + lengthMs;
    let guard = 0;
    while (this.totalMs < end && guard++ < 2000) {
      this.decide(true);
      const hands = this.state.run.jobs.find((j) => j.lane === "hands");
      const step = Math.max(1000, Math.min(end - this.totalMs, hands ? hands.remaining + 1 : MIN));
      this.advance(step, false);
    }
    this.decide(true);
  }

  private prepareToLeave(): void {
    this.decide(false);
  }

  // ───────────────────────────── decisions ─────────────────────────────

  private decide(present: boolean): void {
    this.maybeReset();
    this.buyMeta();
    this.openPlaces();
    this.buyTools();
    this.manageCrew();
    this.manageParts();
    this.upgradeVehicles();
    this.study();
    this.buyMissing();
    this.buyShell();
    this.build();
    this.benchWork();
    this.setHabits();
    this.race(present);
    this.fillHands(present);
  }

  private queueFree(): number {
    return 3 - this.state.run.queue.length;
  }

  private enqueue(spec: JobSpec): boolean {
    if (this.queueFree() <= 0) return false;
    return this.act({ type: "enqueue", spec });
  }

  private openPlaces(): void {
    for (const id of ["place:dirt", "place:junkyard", "place:auction", "place:long_haul", "place:yards"]) {
      if (!canOpenPlace(this.state, id)) this.act({ type: "openPlace", knowhowId: id });
    }
  }

  private reserve(): number {
    const venues = this.state.run.venuesOpen;
    const top = venues[venues.length - 1];
    return getVenue(top).events.feature.entry * 2;
  }

  private buyTools(): void {
    const order = ["parts_washer", "shelving", "welder", "tire_machine", "shelving", "impact_wrench", "second_bench", "engine_hoist", "shelving", "shelving"];
    for (const id of order) {
      const tool = TOOLS.find((t) => t.id === id)!;
      if ((this.state.run.tools[id] ?? 0) >= tool.max) continue;
      if (id === "engine_hoist" && !this.state.run.vehicles.some((v) => v.vehicleId === "go_kart")) continue;
      if (id === "welder" && !this.state.run.venuesOpen.includes("dirt")) continue;
      if (this.state.run.cash - tool.cash < this.reserve()) return;
      this.act({ type: "buyTool", toolId: id });
      return;
    }
  }

  private study(): void {
    for (const id of [...this.state.run.available]) {
      if (this.state.run.queue.some((q) => q.kind === "study")) return;
      if (this.state.run.jobs.some((j) => j.spec.kind === "study")) return;
      this.enqueue({ kind: "study", knowhowId: id });
    }
  }

  private partScore(part: PartInstance): number {
    const def = getPart(part.partId);
    const w = DISCIPLINES[resolveFlags(this.state).discipline].weights;
    return (def.power * w.power + def.handling * w.handling + def.reliability * w.reliability) * CONDITION_STAT[part.condition] - def.weight * w.weight;
  }

  /** Part ids any current-or-future vehicle can use. */
  private usefulPartIds(): Set<string> {
    const maxTier = Math.max(-1, ...this.state.run.vehicles.map((v) => getVehicle(v.vehicleId).tier));
    const ids = new Set<string>();
    for (const v of VEHICLES) if (v.tier >= maxTier) for (const slot of v.slots) slot.accepts.forEach((id) => ids.add(id));
    return ids;
  }

  private manageParts(): void {
    const s = this.state;
    const reserved = reservedPartUids(s);
    const useful = this.usefulPartIds();
    const byId = new Map<string, PartInstance[]>();
    for (const p of s.run.inventory) {
      if (reserved.has(p.uid)) continue;
      byId.set(p.partId, [...(byId.get(p.partId) ?? []), p]);
    }
    const sell: string[] = [];
    for (const [partId, parts] of byId) {
      const def = getPart(partId);
      if (def.category === "junk") continue; // stripped on the bench
      const sorted = [...parts].sort((a, b) => b.condition - a.condition);
      const keep = useful.has(partId) ? (def.category === "wheel" ? 2 : 1) : 0;
      sorted.slice(keep).forEach((p) => sell.push(p.uid));
    }
    const storage = Math.floor(channel(s, "storage"));
    const junk = s.run.inventory.filter((p) => getPart(p.partId).category === "junk" && !reserved.has(p.uid));
    if (s.run.inventory.length - sell.length > storage * 0.8) junk.slice(0, Math.max(0, junk.length - 3)).forEach((p) => sell.push(p.uid));
    // Keep surplus that yields a short material for stripping instead of selling it.
    const m = s.run.materials;
    const short = new Set<string>([m.metal < 20 ? "metal" : "", m.rubber < 6 ? "rubber" : "", m.wiring < 4 ? "wiring" : ""].filter(Boolean));
    this.surplus = new Set(sell.filter((uid) => {
      const part = s.run.inventory.find((p) => p.uid === uid);
      return part ? Object.keys(STRIP_YIELD[getPart(part.partId).category]).some((mat) => short.has(mat)) : false;
    }).slice(0, 8));
    const toSell = sell.filter((uid) => !this.surplus.has(uid));
    if (toSell.length > 0 && !(s.config.dare === "packrat")) this.act({ type: "sell", partUids: toSell });
  }

  private surplus = new Set<string>();

  private materialsShort(): boolean {
    const m = this.state.run.materials;
    return m.metal < 20 || m.rubber < 6 || m.wiring < 4;
  }

  /** Buys parts the next vehicle is missing at the Parts Counter when cash allows. */
  private buyMissing(): void {
    const s = this.state;
    const owned = new Set(s.run.vehicles.map((v) => v.vehicleId));
    const next = VEHICLES.find((v) => !owned.has(v.id) && (!v.blueprint || s.run.learned.includes(v.blueprint)));
    if (!next) return;
    for (const slot of next.slots) {
      if (!slot.required || slot.minCondition !== undefined) continue;
      if (s.run.inventory.some((p) => slot.accepts.includes(p.partId) && p.condition > 0)) continue;
      const pick = slot.accepts.find((id) => !counterBlocker(this.state, id) && this.state.run.cash - counterPrice(id) > this.reserve());
      if (pick) this.act({ type: "buyPart", partId: pick });
    }
  }

  private buyShell(): void {
    const s = this.state;
    if (!s.run.learned.includes("blueprint:beater_car")) return;
    if (s.run.vehicles.some((v) => v.vehicleId === "beater_car") || s.run.inventory.some((p) => p.partId === "beater_shell")) return;
    if (s.run.cash - 150 > this.reserve()) this.act({ type: "buyShell" });
  }

  private benchWork(): void {
    const s = this.state;
    const benches = Math.floor(channel(s, "benches"));
    let busy = s.run.jobs.filter((j) => isBenchKind(j.spec)).length + s.run.queue.filter((q) => isBenchKind(q)).length;
    const reserved = reservedPartUids(s);
    const candidates = s.run.inventory.filter((p) => !reserved.has(p.uid));
    const tryJob = (spec: JobSpec) => {
      if (busy >= benches || this.queueFree() <= 0) return;
      if (jobBlocker(s, spec)) return;
      if (this.enqueue(spec)) busy++;
    };
    // Strip junk when materials are short.
    const needMaterials = this.materialsShort();
    for (const p of candidates) if (this.surplus.has(p.uid)) tryJob({ kind: "strip", partUid: p.uid });
    for (const p of candidates) {
      const def = getPart(p.partId);
      if (def.category === "body") {
        tryJob({ kind: p.condition === 1 ? "clean" : "repair", partUid: p.uid });
        continue;
      }
      if (def.category === "junk") {
        if (needMaterials) tryJob({ kind: "strip", partUid: p.uid });
        continue;
      }
      if (p.condition <= 1 && (p.condition === 1 || this.state.run.vehicles.some((v) => getVehicle(v.vehicleId).slots.some((sl) => sl.accepts.includes(p.partId))))) tryJob({ kind: "clean", partUid: p.uid });
      else if (p.condition === 2 && REPAIR_TECHNIQUE[def.category]) tryJob({ kind: "repair", partUid: p.uid });
      else if (p.condition === 0 && !this.surplus.has(p.uid)) tryJob({ kind: "strip", partUid: p.uid });
    }
    // Restore installed parts by swapping them out when Tuning is known (only when idle bench).
    if (busy < benches && s.run.learned.includes("tech:tuning")) {
      const restorable = candidates.filter((p) => p.condition === 3 && getPart(p.partId).category !== "junk").sort((x, y) => getPart(y.partId).value - getPart(x.partId).value);
      for (const p of restorable) tryJob({ kind: "restore", partUid: p.uid });
    }
  }

  private build(): void {
    const s = this.state;
    if (s.run.jobs.some((j) => j.spec.kind === "assemble") || s.run.queue.some((q) => q.kind === "assemble")) return;
    const owned = new Set(s.run.vehicles.map((v) => v.vehicleId));
    const candidates = [...VEHICLES].reverse();
    for (const def of candidates) {
      if (owned.has(def.id)) continue;
      if (def.blueprint && !s.run.learned.includes(def.blueprint)) continue;
      const reserved = reservedPartUids(s);
      const partUids: Record<string, string> = {};
      const used = new Set<string>();
      let ok = true;
      for (const slot of def.slots) {
        const best = s.run.inventory
          .filter((p) => !reserved.has(p.uid) && !used.has(p.uid) && slot.accepts.includes(p.partId) && p.condition > 0 && (slot.minCondition === undefined || p.condition >= slot.minCondition))
          .sort((a, b) => this.partScore(b) - this.partScore(a))[0];
        if (!best) {
          if (slot.required) ok = false;
          continue;
        }
        partUids[slot.slot] = best.uid;
        used.add(best.uid);
      }
      if (!ok) continue;
      if (this.enqueue({ kind: "assemble", vehicleId: def.id, partUids, name: "" })) return;
    }
  }

  private upgradeVehicles(): void {
    const s = this.state;
    for (const vehicle of s.run.vehicles) {
      if (vehicleBusy(s, vehicle.uid)) continue;
      for (const slot of getVehicle(vehicle.vehicleId).slots) {
        const current = vehicle.parts[slot.slot];
        const reserved = reservedPartUids(this.state);
        const best = this.state.run.inventory
          .filter((p) => !reserved.has(p.uid) && slot.accepts.includes(p.partId) && p.condition > 0 && (slot.minCondition === undefined || p.condition >= slot.minCondition))
          .sort((a, b) => this.partScore(b) - this.partScore(a))[0];
        if (best && (!current || this.partScore(best) > this.partScore(current) * 1.02)) {
          this.act({ type: "install", vehicleUid: vehicle.uid, slot: slot.slot, partUid: best.uid });
        }
      }
      // Pull worn-out parts with no replacement so the bench can fix them.
      for (const [slot, part] of Object.entries(this.state.run.vehicles.find((v) => v.uid === vehicle.uid)?.parts ?? {})) {
        if (part && part.condition <= 1) this.act({ type: "uninstall", vehicleUid: vehicle.uid, slot });
      }
      if (this.state.run.learned.includes("tech:tuning") && vehicle.tune === "balanced") this.act({ type: "setTune", vehicleUid: vehicle.uid, tune: "power" });
    }
  }

  private bestRace(): { vehicle: Vehicle; venueId: string; event: EventKind; p: number } | null {
    const s = this.state;
    let best: { vehicle: Vehicle; venueId: string; event: EventKind; p: number; value: number } | null = null;
    for (const vehicle of s.run.vehicles) {
      if (vehicleBusy(s, vehicle.uid)) continue;
      for (const venueId of s.run.venuesOpen) {
        for (const event of EVENT_KINDS) {
          const spec: JobSpec = { kind: "race", vehicleUid: vehicle.uid, venueId, event, call: "push" };
          if (jobBlocker(s, spec)) continue;
          const p = winChance(s, vehicle, venueId, event, "push");
          const venue = getVenue(venueId);
          const tierIndex = VENUES.findIndex((v) => v.id === venueId);
          const progress = event === "feature" && s.run.featureWins[venueId] === undefined ? 3 : 1;
          const value = (p * venue.events[event].prize - venue.events[event].entry * 0.5) * progress + p * (tierIndex + 1) * 10 * progress;
          if (p < 0.08 && !(event !== "feature" && !(s.run.ladder[venueId] ?? []).includes(event === "sprint" ? "heat" : "feature"))) continue;
          if (!best || value > best.value) best = { vehicle, venueId, event, p, value };
        }
      }
    }
    return best;
  }

  private race(present: boolean): void {
    const s = this.state;
    if (!present && !s.run.habitsKnown.includes("race")) return;
    if (s.run.jobs.some((j) => j.lane === "hands") || s.run.queue.some((q) => q.kind === "race")) return;
    const pick = this.bestRace();
    if (!pick) return;
    this.enqueue({ kind: "race", vehicleUid: pick.vehicle.uid, venueId: pick.venueId, event: pick.event, call: pick.p > 0.6 ? "nurse" : "push" });
  }

  private bestHaulPlace(longOk: boolean): string | null {
    const s = this.state;
    const open = PLACES.filter((p) => s.run.placesOpen.includes(p.id) && !jobBlocker(s, { kind: "haul", placeId: p.id }));
    const scored = open
      .filter((p) => longOk || p.tripMs <= 10 * MIN)
      .map((p) => ({ id: p.id, value: (p.finds.reduce((sum, f) => sum + getPart(f.partId).value * f.weight, 0) / p.finds.reduce((s2, f) => s2 + f.weight, 0)) / (p.tripMs / HOUR + 0.05) }));
    // Prefer the highest-tier place you can reach; long trips when away.
    const tierOrder = ["long_haul", "auction", "junkyard", "yards", "curb"];
    for (const id of tierOrder) if (scored.some((x) => x.id === id)) return id;
    return scored[0]?.id ?? null;
  }

  private fillHands(present: boolean): void {
    const s = this.state;
    if (s.run.jobs.some((j) => j.lane === "hands") && this.queueFree() <= (present ? 2 : 0)) return;
    const place = this.bestHaulPlace(!present);
    if (!place) return;
    if (present) {
      if (!s.run.jobs.some((j) => j.lane === "hands") && s.run.queue.every((q) => isBenchKind(q))) this.enqueue({ kind: "haul", placeId: place });
      return;
    }
    // Leaving: queue the longest useful trips.
    while (this.queueFree() > 0) {
      const p = this.bestHaulPlace(true);
      if (!p || !this.enqueue({ kind: "haul", placeId: p })) break;
    }
  }

  private setHabits(): void {
    const s = this.state;
    if (resolveFlags(s).teamEra) return;
    const known = s.run.habitsKnown;
    const wanted: string[] = [];
    const bestHaul = ["haul:long_haul", "haul:junkyard", "haul:yards", "haul:curb"].find((t) => known.includes(t) && !jobBlocker(s, { kind: "haul", placeId: t.slice(5) }));
    if (bestHaul) wanted.push(bestHaul);
    if (known.includes("clean")) wanted.push("clean");
    if (known.includes("repair")) wanted.push("repair");
    if (known.includes("strip")) wanted.push("strip");
    if (known.includes("race")) {
      const pick = this.bestRace();
      if (pick && pick.p > 0.25) wanted.push(`race:${pick.vehicle.uid}:${pick.venueId}:${pick.event}:nurse`);
    }
    s.run.habitSlots.forEach((current, i) => {
      const want = wanted[i] ?? null;
      if (want && current !== want) this.act({ type: "setHabit", slot: i, template: want });
    });
  }

  private manageCrew(): void {
    const s = this.state;
    if (!s.era) return;
    while (s.era && this.state.era!.crew.length < crewCap(this.state) && this.state.run.candidates.length > 0) {
      if (!this.act({ type: "hire", crewId: this.state.run.candidates[0] })) break;
    }
    const era = this.state.era!;
    const hasDriver = era.crew.some((c) => c.assignment.type === "driver");
    for (const member of era.crew) {
      const def = CREW_BY_ID[member.id];
      if (def?.driverPerf && !hasDriver && member.assignment.type !== "driver") {
        this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "driver" } });
        continue;
      }
      if (member.assignment.type === "queue" && member.morale < 25) this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "rest" } });
      else if (member.assignment.type === "rest" && member.morale > 90) this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "queue" } });
      else if (member.assignment.type === "queue") {
        const habit = this.state.run.habitsKnown.find((h) => h.startsWith("haul:"));
        if (habit && def?.role === "hauler") this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "habit", template: habit } });
        else if (def?.role === "wrench" && this.state.run.habitsKnown.includes("repair")) this.act({ type: "assignCrew", crewId: member.id, assignment: { type: "habit", template: "repair" } });
      }
    }
  }

  private buyMeta(): void {
    for (const upgrade of TEAM_UPGRADES) this.act({ type: "buyTeamUpgrade", upgradeId: upgrade.id });
  }

  private chooseScrap(slots: number, points: number, teamEra: boolean, lpAvailable: number): ScrapChoices {
    const buy: string[] = [];
    const order = ["barn_find", "tow_hitch", "kid_brother", "night_owl", "shade_tree", "junkyard_eyes", "old_notebook", "tow_hitch", "second_bench", "swap_meet", "underdog", "early_bird", "tow_hitch", "night_owl", "scavengers_map", "grudge_match"];
    let ranks: Record<string, number> = { ...this.state.meta.perks };
    for (const id of order) {
      const attempt = planPurchases(this.state, [...buy, id], lpAvailable);
      if (typeof attempt !== "string") {
        buy.push(id);
        ranks = attempt.ranks;
      }
    }
    const priority = this.policy === "push" ? ["tow_hitch", "second_bench", "barn_find", "shade_tree", "night_owl", "kid_brother", "junkyard_eyes", "old_notebook", "underdog"] : ["barn_find", "tow_hitch", "kid_brother", "shade_tree", "night_owl", "junkyard_eyes", "second_bench", "early_bird"];
    const perks = priority.filter((id) => (ranks[id] ?? 0) > 0).slice(0, slots);
    const half = Math.floor(points / 2);
    const dares = ["mower_madness", "quick_season", "packrat", "settle_it"].filter((d) => !this.state.meta.daresCompleted.includes(d));
    return {
      buy,
      perks,
      tuneUp: { haul: half, wrench: points - half, build: 0, race: 0 },
      dare: this.policy === "sprint" ? dares[0] ?? null : null,
      hardships: teamEra ? ["rust_everything"].slice(0, 1) : [],
    };
  }

  private maybeReset(): void {
    const s = this.state;
    const seasonMs = s.run.seasonMs;
    const fairWon = s.run.featureWins.county_fair !== undefined;
    const stateWon = s.run.featureWins.state !== undefined;
    const stuck = seasonMs > (this.policy === "push" ? 21 : 14) * 24 * HOUR;
    if (LAYERS.team.gate(s).ok && (stateWon || (s.era && fairWon && (this.policy === "sprint" || stuck)))) {
      if (!s.era || s.era.seasonIndex >= 3) {
        const choices: TeamChoices = { ...this.chooseScrap(2 + (s.team.upgrades.legacy_ledger ?? 0), 5, true, s.scrap.lp), discipline: s.era?.discipline === "dirt" ? "drag" : this.discipline, teamName: "Bot Racing", colors: ["#c33", "#eee"] };
        this.recordSeason();
        if (this.act({ type: "reset", layer: "team", choices })) return;
      }
    }
    if (!fairWon) return;
    const wantReset = this.policy === "sprint" ? true : stateWon || stuck;
    if (!wantReset) return;
    const choices = this.chooseScrap(nextSeasonPerkSlots(s), nextSeasonTuneUpPoints(s), s.era !== null, s.scrap.lp + LAYERS.scrap.award(s));
    this.recordSeason();
    if (!this.act({ type: "reset", layer: "scrap", choices })) this.errors.push("scrap reset failed");
  }

  private recordSeason(): void {
    this.seasonLog.push({ season: this.state.meta.seasonsPlayed + 1, ms: this.state.run.seasonMs, lp: LAYERS.scrap.award(this.state), policy: this.policy, venues: Object.keys(this.state.run.featureWins) });
  }
}

export function habitOf(template: string): string {
  return templateBase(template);
}

export { getPlace };
