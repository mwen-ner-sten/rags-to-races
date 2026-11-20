import Image from "next/image";
import type { ClubCourseId } from "@/core/clubTrack";
import { referencePosition, type RallyClock } from "@/core/timecards";
import courses from "../../rally-course.json";
import { rallySprite, stageSprite } from "../../sprites";

function marker(course: number[][], progress: number) {
  const lengths = course.slice(1).map(([x, y], i) => Math.hypot((x - course[i][0]) * 2.4, y - course[i][1]));
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const f = Math.min(1, remaining / lengths[i]);
      const [x, y] = course[i];
      const dx = course[i + 1][0] - x;
      const dy = course[i + 1][1] - y;
      return { left: x + dx * f + "%", top: y + dy * f + "%", angle: (Math.atan2(dy, dx * 2.4) * 180) / Math.PI };
    }
    remaining -= lengths[i];
  }
  return { left: "0%", top: "0%", angle: 0 };
}

interface Props {
  progress: number;
  label: string;
  stages: number;
  vehicleId: string;
  course?: ClubCourseId;
  clock?: RallyClock;
}
export function RallyStage({ progress, label, stages, vehicleId, course, clock }: Props) {
  const layout = course ?? "forest";
  const route = courses[layout];
  const own = marker(route, progress);
  const ghostProgress = clock && referencePosition(clock, stages, progress);
  const ghost = ghostProgress === undefined ? undefined : marker(route, ghostProgress);
  return (
    <>
      <div
        className="rally-stage"
        role="img"
        aria-label={label + (ghost ? " · racing the recorded pace of " + clock?.previousCar : "")}
      >
        <Image src={stageSprite(layout)} width={1152} height={480} alt="" />
        {ghost && <span className="rally-ghost" style={{ left: ghost.left, top: ghost.top }} />}
        <span
          className="rally-car"
          style={{
            left: own.left,
            top: own.top,
            transform: `translate(-50%, -50%) rotate(${own.angle}deg)`,
            backgroundImage: `url(${rallySprite(vehicleId)})`,
          }}
        />
      </div>
      {ghost && (
        <p className="small rally-key">
          <span className="ghost-swatch" /> Reference · {clock?.previousCar} · Season {clock?.referenceSeason}
        </p>
      )}
    </>
  );
}
