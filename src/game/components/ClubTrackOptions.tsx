import { clubCourseGate } from "@/core/club";
import { CLUB_COURSES, type ClubCourseId } from "@/core/clubTrack";
import { COUNTY_RIVALS, COUNTY_RIVAL_IDS, type CountyRivalId } from "@/core/countyRivals";
import { HOME_COUNTIES } from "@/core/counties";
import { getPart } from "@/core/content/parts";
import type { GameState } from "@/core/types";

const layouts = Object.keys(CLUB_COURSES) as ClubCourseId[];

export function ClubTrackOptions({ game, course, loan, onCourse, onLoan }: {
  game: GameState;
  course: ClubCourseId | undefined;
  loan: ClubCourseId | CountyRivalId | undefined;
  onCourse: (layout: ClubCourseId | undefined) => void;
  onLoan: (layout: ClubCourseId | CountyRivalId | undefined) => void;
}) {
  const locked = clubCourseGate(game);
  const loans = game.club?.trackLicenses ?? [];
  const visitors = COUNTY_RIVAL_IDS.filter((id) => game.countyRivals?.[id]?.earned);
  const canBorrow = loans.length + visitors.length > 0;
  if (locked && !canBorrow) return <p className="hint">{locked}</p>;
  return (
    <fieldset>
      <legend>Club track layout</legend>
      {locked ? <p className="hint">{locked}</p> : <>
      <label className="check"><input type="radio" name="club-layout" checked={!course} onChange={() => onCourse(undefined)} /> Standard venue layouts</label>
      {layouts.map((id) => {
        const layout = CLUB_COURSES[id];
        return <label className="check" key={id}>
          <input type="radio" name="club-layout" checked={course === id} onChange={() => onCourse(id)} />
          <span><strong>{layout.name}</strong>. {layout.brief} Certify the club with {layout.podiums} {layout.proofCall === "push" ? "Push" : "Nurse"} podiums to license {getPart(layout.loanPart).name}.
            {layout.surcharge > 0 && ` Costs ${layout.surcharge} extra Scrap Bucks per start.`}</span>
        </label>;
      })}
      </>}
      {canBorrow && <label className="inline" htmlFor="club-workshop-loan">Workshop loan
        <select id="club-workshop-loan" value={loan ?? ""} onChange={(event) => onLoan(event.target.value ? event.target.value as ClubCourseId | CountyRivalId : undefined)}>
          <option value="">No loan</option>
          {loans.map((id) => <option value={id} key={id}>{getPart(CLUB_COURSES[id].loanPart).name} · {CLUB_COURSES[id].name}</option>)}
          {visitors.map((id) => <option value={id} key={id}>{getPart(COUNTY_RIVALS[id].part).name} · {COUNTY_RIVALS[id].name} · {HOME_COUNTIES[COUNTY_RIVALS[id].county].name}</option>)}
        </select>
      </label>}
      {canBorrow && <p className="hint">Borrow one Good part from a track or a visitor, even if you move counties. It fits any compatible car and uses no donor slot.</p>}
    </fieldset>
  );
}
