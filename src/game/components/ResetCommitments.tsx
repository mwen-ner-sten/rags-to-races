import { CLUB_CHARTERS, clubScore } from "@/core/club";
import { WORKS_FAMILIES, worksReport } from "@/core/manufacturer";
import { CHARTERS, TOUR_SPONSORS, ownerTourActive } from "@/core/ownership";
import type { GameState } from "@/core/types";
import { num } from "../format";

export function ResetCommitments({ game }: { game: GameState }) {
  const tour = ownerTourActive(game) ? game.owner?.tour : undefined;
  const sponsor = tour?.sponsor && TOUR_SPONSORS[tour.sponsor];
  const works = game.manufacturer?.active;
  const report = works && worksReport(works);
  const club = game.club?.active;
  const heritage = game.run.heritageProject;
  return (
    <>
      {tour && <p className="why">This reset retires the {CHARTERS[tour.charter].name}{tour.entryPlan?.enabled ? " and stops its entry plan." : "."} {sponsor && `You lose the ${num(sponsor.stake)} Scrap Bucks stake with ${sponsor.name} and the chance at its payout. `}Recorded rounds and earned titles stay.</p>}
      {works && report && !report.homologated && !report.failed && <p className="why">This reset retires the {WORKS_FAMILIES[works.family].name} deal and files {works.attempts.length} completed {works.attempts.length === 1 ? "trial" : "trials"}. Earned drawings stay.</p>}
      {club && !clubScore(club).complete && <p className="why">This reset retires the {CLUB_CHARTERS[club.charter].name} calendar and archives {club.rounds.length} completed {club.rounds.length === 1 ? "round" : "rounds"}. Earned certificates stay.</p>}
      {heritage && !heritage.completed && <p className="why">This reset ends the open {heritage.kind === "exhibit" ? "museum exhibit" : "period special"} for {heritage.originalName}. The original Hall of Fame entry and earned Heritage awards stay.</p>}
    </>
  );
}
