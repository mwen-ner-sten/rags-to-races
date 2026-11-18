import { getVenue, venueName } from "@/core/content/events";
import { CHARTERS, finishPoints, ownerCharterBlocker, sponsorProgress, TOUR_SPONSORS, tourCalendar, tourScore } from "@/core/ownership";
import { PROMOTER_CHARTERS, promoterBookingReason, promoterGate, promoterReport, promoterSchedule, promoterTargets } from "@/core/promoter";
import type { GameState } from "@/core/types";
import { num, ordinal } from "./format";

export interface AwayCareerReport {
  tab: "owner" | "promoter";
  title: string;
  detail: string;
  next: string;
  circuitOpened?: boolean;
}

export function awayCareer(before: GameState, after: GameState) {
  const reports: AwayCareerReport[] = [];
  const coveredFeedKeys = new Set<string>();
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
    if (tour.status === "champion") {
      reports.push({ tab: "owner", title: `Won the ${charter.name}`, detail: `${roundSummary}${score.points} championship points and ${charter.teamPoints} Team Points earned.${sponsorSummary}`, next: unlocked || "Choose your next championship.", circuitOpened });
    } else if (tour.status === "finished") {
      reports.push({ tab: "owner", title: `${charter.name} complete`, detail: `${roundSummary}${score.points}/${charter.target} points and ${score.cars}/${charter.minCars} scoring cars.${sponsorSummary}`, next: "Review the standings before choosing your next charter." });
    } else if (lastRound && stop) {
      const lastStop = calendar[tour.rounds.length - 1];
      const finish = lastRound.dnf ? "did not finish" : `finished ${ordinal(lastRound.position)}`;
      reports.push({ tab: "owner", title: `${charter.name} · Round ${tour.rounds.length} settled`, detail: `${roundSummary}${lastRound.carName} ${finish} at ${venueName(lastStop.venueId, tour.discipline)} and scored ${finishPoints(lastRound)} points.`, next: `Next up is the ${stop.event} at ${venueName(stop.venueId, tour.discipline)}.` });
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
    reports.push({ tab: "promoter", title: charter.name, detail, next });
  }
  return { reports, coveredFeedKeys };
}
