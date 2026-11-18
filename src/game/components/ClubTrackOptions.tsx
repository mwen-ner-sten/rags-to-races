import { clubCourseGate } from "@/core/club";
import { CLUB_COURSES, type ClubCourseId } from "@/core/clubTrack";
import { getPart } from "@/core/content/parts";
import type { GameState } from "@/core/types";

const layouts = Object.keys(CLUB_COURSES) as ClubCourseId[];

export function ClubTrackOptions({ game, course, loan, onCourse, onLoan }: {
  game: GameState;
  course: ClubCourseId | undefined;
  loan: ClubCourseId | undefined;
  onCourse: (layout: ClubCourseId | undefined) => void;
  onLoan: (layout: ClubCourseId | undefined) => void;
}) {
  const locked = clubCourseGate(game);
  const loans = game.club?.trackLicenses ?? [];
  if (locked) return <p className="hint">{locked}</p>;
  return (
    <fieldset>
      <legend>Club track layout</legend>
      <label className="check"><input type="radio" name="club-layout" checked={!course} onChange={() => onCourse(undefined)} /> Standard venue layouts</label>
      {layouts.map((id) => {
        const layout = CLUB_COURSES[id];
        return <label className="check" key={id}>
          <input type="radio" name="club-layout" checked={course === id} onChange={() => onCourse(id)} />
          <span><strong>{layout.name}</strong>. {layout.brief} Certify the club with {layout.podiums} {layout.proofCall === "push" ? "Push" : "Nurse"} podiums to license {getPart(layout.loanPart).name}.
            {layout.surcharge > 0 && ` Costs ${layout.surcharge} extra Scrap Bucks per start.`}</span>
        </label>;
      })}
      {loans.length > 0 && <label className="inline" htmlFor="club-workshop-loan">Workshop loan
        <select id="club-workshop-loan" value={loan ?? ""} onChange={(event) => onLoan(event.target.value ? event.target.value as ClubCourseId : undefined)}>
          <option value="">No loan</option>
          {loans.map((id) => <option value={id} key={id}>{getPart(CLUB_COURSES[id].loanPart).name} · {CLUB_COURSES[id].name}</option>)}
        </select>
      </label>}
      {loans.length > 0 && <p className="hint">Borrow one Good part for this Club Season. It can be fitted to any compatible car and uses no donor slot.</p>}
    </fieldset>
  );
}
