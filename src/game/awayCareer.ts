import { getVenue, venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import type { CareerDestination } from "@/core/careerAdvice";
import { HOME_COUNTIES } from "@/core/counties";
import { BATON_PART, otherCounty } from "@/core/countyBaton";
import { garageSpace } from "@/core/garage";
import { exhibitBlocker, heritageClaimBlocker } from "@/core/heritage";
import { WORKS_FAMILIES, worksReport } from "@/core/manufacturer";
import { MOTOR_ROUTES } from "@/core/motorPool";
import { CHARTERS, finishPoints, ownerCharterBlocker, sponsorProgress, TOUR_SPONSORS, tourCalendar, tourScore } from "@/core/ownership";
import { PROMOTER_CHARTERS, promoterBookingReason, promoterGate, promoterReport, promoterSchedule, promoterTargets } from "@/core/promoter";
import { serviceDelivery } from "@/core/serviceShop";
import type { GameState } from "@/core/types";
import { num, ordinal } from "./format";

export interface AwayCareerReport {
  id: string;
  tab: CareerDestination["tab"];
  destination: CareerDestination;
  action: string;
  title: string;
  detail: string;
  next: string;
  circuitOpened?: boolean;
}

function workshopUpdates(before: GameState, after: GameState, coveredFeedKeys: Set<string>): AwayCareerReport[] {
  const reports: AwayCareerReport[] = [];
  const claim = after.motorPool?.claim;
  if (claim && before.motorPool?.job?.part.uid === claim.part.uid) {
    reports.push({
      id: "motor-pickup", tab: "garage", destination: { tab: "garage", section: "motor-pickup" }, action: "Open depot pickup",
      title: "Depot stock ready for pickup",
      detail: `${MOTOR_ROUTES[claim.route].name} brought back a ${getPart(claim.part.partId).name}.`,
      next: after.run.inventory.length >= garageSpace(after) ? "Free a garage slot, then collect the stock at the depot." : "Collect the stock at the County Motor Pool.",
    });
  }

  const delivery = serviceDelivery(after);
  if (typeof delivery !== "string" && typeof serviceDelivery(before) === "string") {
    reports.push({
      id: "service-delivery", tab: "garage", destination: { tab: "garage", section: "service-delivery" }, action: "Open customer repair",
      title: "Customer repair ready for delivery",
      detail: `${getPart(delivery.part.partId).name} is ready for ${delivery.client.name}.`,
      next: `Deliver it at the repair counter to collect ${num(delivery.client.cash)} Scrap Bucks.`,
    });
  }

  const project = after.run.heritageProject;
  const previousProject = before.run.heritageProject;
  if (project && previousProject?.uid === project.uid && !previousProject.completed) {
    const car = project.kind === "exhibit" && after.run.vehicles.find((vehicle) => !exhibitBlocker(after, project, vehicle));
    const wasReady = car && before.run.vehicles.some((vehicle) => !exhibitBlocker(before, previousProject, vehicle));
    if (car && !wasReady) {
      reports.push({
        id: "heritage-exhibit", tab: "notebook", destination: { tab: "notebook", section: "Hall of Fame", heritage: true, vehicleUid: car.uid },
        action: "Inspect the museum car", title: "Museum car ready for inspection",
        detail: `${car.name} meets the museum’s shakedown and exhibit requirements.`,
        next: "Inspect the car in the Heritage Register before deciding whether to donate it.",
      });
    } else if (project.kind === "special" && project.completed) {
      coveredFeedKeys.add(`heritage:${project.uid}`);
      const blocked = heritageClaimBlocker(after, project.kind, project.model);
      reports.push({
        id: "heritage-special", tab: "notebook", destination: { tab: "notebook", section: "Hall of Fame", heritage: true },
        action: "Open the Heritage Register", title: "Period special entered in the Heritage Register",
        detail: `${project.completed} unlocked a tuning jig based on ${project.originalName}.`,
        next: blocked ?? "Make the jig in the Heritage Register to unlock early tuning for this model.",
      });
    }
  }

  const deal = after.manufacturer?.active;
  const previousDeal = before.manufacturer?.active;
  if (deal && previousDeal?.id === deal.id && deal.attempts.length > previousDeal.attempts.length) {
    const family = WORKS_FAMILIES[deal.family];
    const result = worksReport(deal);
    const attempt = deal.attempts[deal.attempts.length - 1];
    if (result.homologated) coveredFeedKeys.add(`works:honors:${deal.id}`);
    reports.push({
      id: "works-proof", tab: "manufacturer", destination: { tab: "manufacturer", section: "deal" }, action: "Open Works report",
      title: result.homologated ? "Works article homologated" : attempt.passed ? "Works benchmark passed" : "Works benchmark missed",
      detail: `${deal.article} for ${family.name} · ${result.step}/${family.tests.length} benchmarks passed.`,
      next: result.homologated ? `The ${num(family.grant)} Scrap Bucks grant was paid. File the report and use the drawing at a future Scrap Reset.`
        : result.failed ? "The deal is out of starts or budget. File the Works report." : "Review the remaining benchmark and entry terms in Manufacturer.",
    });
  }

  const baton = after.run.countyBaton;
  const previousBaton = before.run.countyBaton;
  if (baton && previousBaton?.from === baton.from) {
    const countyName = HOME_COUNTIES[otherCounty(baton.from)].name;
    if (baton.leg === "qualify" && previousBaton.leg === "qualify" && baton.qualified && baton.qualified.uid !== previousBaton.qualified?.uid) {
      coveredFeedKeys.add("county-baton-qualified");
      reports.push({
        id: "baton-qualified", tab: "legacy", destination: { tab: "legacy", section: "baton" }, action: "Open County Baton",
        title: "County Baton qualified", detail: `Your ${getPart(BATON_PART[baton.from]).name} earned the first leg.`,
        next: `Carry that exact part to ${countyName} using the County Baton option at Scrap Reset.`,
      });
    }
    if (baton.leg === "deliver" && previousBaton.leg === "deliver" && baton.completedAt !== undefined && previousBaton.completedAt === undefined) {
      coveredFeedKeys.add("county-baton-delivered");
      reports.push({
        id: "baton-delivered", tab: "legacy", destination: { tab: "legacy", section: "baton" }, action: "Open County Baton",
        title: "County Baton delivered", detail: `The Fair win with your inherited part earned a ${countyName} freight permit.`,
        next: "Use the permit at a future Scrap Reset into that county.",
      });
    }
  }
  return reports;
}

export function awayCareer(before: GameState, after: GameState) {
  const coveredFeedKeys = new Set<string>();
  const reports = workshopUpdates(before, after, coveredFeedKeys);
  const previousTour = before.owner?.tour;
  const tour = after.owner?.tour;
  if (tour && previousTour?.id === tour.id && tour.rounds.length > previousTour.rounds.length) {
    const charter = CHARTERS[tour.charter];
    const score = tourScore(tour);
    const lastRound = tour.rounds[tour.rounds.length - 1];
    for (const result of tour.rounds.slice(previousTour.rounds.length)) {
      if (result) coveredFeedKeys.add(`championship-round:${result.raceId}`);
    }
    coveredFeedKeys.add(`championship-result:${tour.id}`);
    const circuitOpened = !promoterGate(before) && promoterGate(after);
    const mixedCupOpened = !!ownerCharterBlocker(before, "county_to_state") && !ownerCharterBlocker(after, "county_to_state");
    if (mixedCupOpened) coveredFeedKeys.add("championship-unlock:county_to_state");
    const unlocked = [circuitOpened && "The Circuit Office is open.", mixedCupOpened && "The County-to-State Cup is open."].filter(Boolean).join(" ");
    const calendar = tourCalendar(tour);
    const stop = calendar[tour.rounds.length];
    const settled = tour.rounds.length - previousTour.rounds.length;
    const roundSummary = settled > 1 ? `${settled} rounds settled. ` : "";
    const sponsorship = tour.sponsor && sponsorProgress(tour);
    const sponsorName = tour.sponsor && TOUR_SPONSORS[tour.sponsor].name;
    const sponsorSummary = sponsorName && sponsorship && (tour.status === "champion" || tour.status === "finished")
      ? sponsorship.payout
        ? ` ${sponsorName} paid ${num(sponsorship.payout)} Scrap Bucks, including your returned stake.`
        : ` ${sponsorName}’s target was missed and the stake was forfeited.`
      : "";
    if (sponsorSummary) coveredFeedKeys.add(`championship-sponsor:${tour.id}`);
    const link = {
      id: "owner", tab: "owner", action: "Open championship report", destination: { tab: "owner", section: "calendar" },
    } as const;
    if (tour.status === "champion") {
      reports.push({ ...link, title: `Won the ${charter.name}`, detail: `${roundSummary}${score.points} championship points and ${charter.teamPoints} Team Points earned.${sponsorSummary}`, next: unlocked || "Choose your next championship.", circuitOpened });
    } else if (tour.status === "finished") {
      reports.push({ ...link, title: `${charter.name} complete`, detail: `${roundSummary}${score.points}/${charter.target} points and ${score.cars}/${charter.minCars} scoring cars.${sponsorSummary}`, next: "Review the standings before choosing your next charter." });
    } else if (lastRound && stop) {
      const lastStop = calendar[tour.rounds.length - 1];
      const finish = lastRound.dnf ? "did not finish" : `finished ${ordinal(lastRound.position)}`;
      reports.push({ ...link, title: `${charter.name} · Round ${tour.rounds.length} settled`, detail: `${roundSummary}${lastRound.carName} ${finish} at ${venueName(lastStop.venueId, tour.discipline)} and scored ${finishPoints(lastRound)} points.`, next: `Next up is the ${stop.event} at ${venueName(stop.venueId, tour.discipline)}.` });
    }
  }

  const meet = after.promoter?.meet;
  const previousMeet = before.promoter?.meet;
  if (meet && previousMeet && before.promoter?.season === after.promoter?.season && meet.results.length > previousMeet.results.length) {
    const charter = PROMOTER_CHARTERS[meet.charter];
    const targets = promoterTargets(meet.charter, meet.stewardship, meet.route);
    const report = promoterReport(meet);
    const count = meet.results.length - previousMeet.results.length;
    const detail = `${count} ${count === 1 ? "meeting ran" : "meetings ran"}. ${report.fieldFinishes}/${targets.fieldFinishes} field finishes${targets.closeFinishes ? ` and ${report.closeFinishes}/${targets.closeFinishes} close finishes` : ""}${targets.winners ? ` and ${report.winners}/${targets.winners} different winners` : ""}.`;
    const nextRound = promoterSchedule(meet.charter, meet.route)[meet.results.length];
    let next: string;
    if (report.qualified) next = "Publish the report to certify the charter.";
    else if (report.complete) {
      const missed: string[] = [];
      if (report.points < targets.points) missed.push(`${report.points}/${targets.points} guest points`);
      if (report.finishes < targets.finishes) missed.push(`${report.finishes}/${targets.finishes} guest finishes`);
      if (report.podiums < targets.podiums) missed.push(`${report.podiums}/${targets.podiums} guest podiums`);
      if (report.fieldFinishes < targets.fieldFinishes) missed.push("field finishes");
      if (report.closeFinishes < targets.closeFinishes) missed.push("close finishes");
      if (report.winners < targets.winners) missed.push("different winners");
      next = `Certification missed on ${missed.join(", ")}. Review the standings before starting another calendar.`;
    } else if (meet.booking) next = `Next meeting booked at ${getVenue(nextRound.venueId).name}.`;
    else next = promoterBookingReason(meet) ?? `Book the next meeting at ${getVenue(nextRound.venueId).name}.`;
    reports.push({ id: "promoter", tab: "promoter", destination: { tab: "promoter" }, action: "Open circuit report", title: charter.name, detail, next });
  }
  return { reports, coveredFeedKeys };
}
